let normalize = require("../sketch/normalize-layer");

function colorToHex(color) {
  return normalize.normalizeColor(color);
}

function enabledItems(items) {
  if (!items || !items.length) {
    return [];
  }
  return items.filter(function (item) {
    return item && item.enabled !== false;
  });
}

function extractGradient(gradient) {
  if (!gradient || typeof gradient !== "object") {
    return null;
  }
  // 仅保留可序列化的基础信息；完整渐变渲染可后续扩展。
  return {
    type: gradient.gradientType || "linear",
    from: gradient.from || null,
    to: gradient.to || null,
    stops: (gradient.stops || []).map(function (stop) {
      return {
        position: typeof stop.position === "number" ? stop.position : 0,
        color: colorToHex(stop.color) || null,
      };
    }),
  };
}

function extractFill(fill) {
  if (!fill) {
    return null;
  }
  let fillType = fill.fillType || "Color";
  let color = fillType === "Color" ? colorToHex(fill.color) : null;
  let gradient = fillType === "Gradient" ? extractGradient(fill.gradient) : null;
  return {
    fillType: fillType,
    color: color,
    gradient: gradient,
  };
}

function extractBorder(border) {
  if (!border) {
    return null;
  }
  let fillType = border.fillType || "Color";
  let color = fillType === "Color" ? colorToHex(border.color) : null;
  let gradient = fillType === "Gradient" ? extractGradient(border.gradient) : null;
  return {
    fillType: fillType,
    color: color,
    gradient: gradient,
    thickness: typeof border.thickness === "number" ? border.thickness : 1,
    position: border.position || "Center",
  };
}

function extractShadow(shadow) {
  return {
    type: shadow.type || "shadow",
    color: colorToHex(shadow.color),
    x: Number(shadow.x) || 0,
    y: Number(shadow.y) || 0,
    blur: Number(shadow.blur) || 0,
    spread: Number(shadow.spread) || 0,
  };
}

function extractRadius(layer) {
  if (!layer) {
    return null;
  }
  if (typeof layer.cornerRadius === "number") {
    return layer.cornerRadius;
  }
  if (layer.points && layer.points.length > 0 && typeof layer.points[0].cornerRadius === "number") {
    return layer.points[0].cornerRadius;
  }
  return null;
}

function cssAttributes(layer) {
  if (!layer || !layer.CSSAttributes || !layer.CSSAttributes.length) {
    return [];
  }
  return layer.CSSAttributes.filter(function (attr) {
    return attr && typeof attr === "string" && !/\/\*/.test(attr);
  });
}

function extractTextStyle(layerStyle, textStyle) {
  return {
    fontFamily: textStyle.fontFamily || null,
    fontSize: typeof textStyle.fontSize === "number" ? textStyle.fontSize : null,
    fontWeight: textStyle.fontWeight ? String(textStyle.fontWeight) : null,
    textColor: colorToHex(textStyle.color || null),
    textAlign: textStyle.alignment || null,
    letterSpacing: typeof textStyle.kerning === "number" ? textStyle.kerning : null,
    lineHeight:
      typeof textStyle.lineHeight === "number"
        ? textStyle.lineHeight
        : textStyle.lineHeight === "undefined"
          ? null
          : textStyle.lineHeight || null,
  };
}

function extractStyle(layer) {
  let style = layer.style || {};
  let textStyle = style.textStyle || {};
  let textInfo = extractTextStyle(style, textStyle);

  return {
    fills: enabledItems(style.fills)
      .map(extractFill)
      .filter(Boolean),
    borders: enabledItems(style.borders)
      .map(extractBorder)
      .filter(Boolean),
    radius: extractRadius(layer),
    opacity: typeof style.opacity === "number" ? style.opacity : 1,
    shadows: enabledItems(style.shadows).map(extractShadow),
    rotation:
      layer.transform && typeof layer.transform.rotation === "number"
        ? layer.transform.rotation
        : null,
    fontFamily: textInfo.fontFamily,
    fontSize: textInfo.fontSize,
    fontWeight: textInfo.fontWeight,
    textColor: textInfo.textColor,
    textAlign: textInfo.textAlign,
    letterSpacing: textInfo.letterSpacing,
    lineHeight: textInfo.lineHeight,
    css: cssAttributes(layer),
  };
}

function hasMeaningfulStyle(style) {
  return (
    style.fills.length > 0 ||
    style.borders.length > 0 ||
    style.radius !== null ||
    style.opacity !== 1 ||
    style.shadows.length > 0 ||
    style.fontFamily !== null ||
    style.fontSize !== null ||
    style.fontWeight !== null ||
    style.textColor !== null ||
    style.rotation !== null ||
    style.css.length > 0
  );
}

function createStyleRegistry() {
  let styles = {};
  let keyToId = {};
  let count = 0;

  return {
    styles: styles,
    register: function (layer) {
      let style = extractStyle(layer);
      if (!hasMeaningfulStyle(style)) {
        return null;
      }

      let key = JSON.stringify(style);
      if (!keyToId[key]) {
        count += 1;
        keyToId[key] = "style_" + String(count).padStart(3, "0");
        styles[keyToId[key]] = style;
      }

      return keyToId[key];
    },
  };
}

function pushUnique(values, value) {
  if (value !== null && value !== undefined && values.indexOf(value) === -1) {
    values.push(value);
  }
}

function extractTokens(styles, texts) {
  let colors = [];
  let fontSizes = [];
  let radii = [];

  Object.keys(styles).forEach(function (styleId) {
    let style = styles[styleId];
    style.fills.forEach(function (fill) {
      pushUnique(colors, fill.color);
    });
    style.borders.forEach(function (border) {
      pushUnique(colors, border.color);
    });
    if (style.radius !== null) {
      pushUnique(radii, style.radius);
    }
    if (style.fontSize !== null) {
      pushUnique(fontSizes, style.fontSize);
    }
    if (style.textColor !== null) {
      pushUnique(colors, style.textColor);
    }
  });

  texts.forEach(function (text) {
    pushUnique(colors, text.color);
    pushUnique(fontSizes, text.fontSize);
  });

  return {
    colors: colors.reduce(function (result, color, index) {
      result["color_" + String(index + 1).padStart(3, "0")] = color;
      return result;
    }, {}),
    fontSize: fontSizes.reduce(function (result, size, index) {
      result["font_size_" + String(index + 1).padStart(3, "0")] = size;
      return result;
    }, {}),
    radius: radii.reduce(function (result, radius, index) {
      result["radius_" + String(index + 1).padStart(3, "0")] = radius;
      return result;
    }, {}),
  };
}

module.exports = {
  createStyleRegistry: createStyleRegistry,
  extractStyle: extractStyle,
  extractTokens: extractTokens,
};

export {};
