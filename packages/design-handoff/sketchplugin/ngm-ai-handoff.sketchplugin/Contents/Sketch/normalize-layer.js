function getFrame(layer) {
  var frame = layer && layer.frame ? layer.frame : {};

  return {
    x: Number(frame.x) || 0,
    y: Number(frame.y) || 0,
    width: Number(frame.width) || 0,
    height: Number(frame.height) || 0,
  };
}

function shouldIgnoreLayer(layer) {
  if (!layer || layer.hidden) {
    return true;
  }

  var name = layer.name || "";
  return name.indexOf("_ignore") === 0 || name.indexOf(".ignore") === 0;
}

function isContainer(layer) {
  return layer && (layer.type === "Group" || layer.type === "Artboard" || layer.type === "SymbolInstance");
}

function getText(layer) {
  if (!layer || layer.type !== "Text") {
    return null;
  }

  return typeof layer.text === "string" ? layer.text : "";
}

function normalizeLayer(layer, styleRegistry) {
  if (shouldIgnoreLayer(layer)) {
    return null;
  }

  var children = [];
  if (layer.layers && layer.layers.length > 0) {
    layer.layers.forEach(function (child) {
      var normalized = normalizeLayer(child, styleRegistry);
      if (normalized) {
        children.push(normalized);
      }
    });
  }

  if (isContainer(layer) && layer.type !== "Artboard" && children.length === 0 && !getText(layer)) {
    return null;
  }

  return {
    id: String(layer.id || ""),
    name: layer.name || "",
    type: layer.type || "Unknown",
    frame: getFrame(layer),
    hidden: Boolean(layer.hidden),
    locked: Boolean(layer.locked),
    text: getText(layer),
    styleRef: styleRegistry ? styleRegistry.register(layer) : null,
    children: children,
  };
}

function collectTexts(layer) {
  var texts = [];

  function visit(current) {
    if (shouldIgnoreLayer(current)) {
      return;
    }

    if (current.type === "Text") {
      var style = current.style || {};
      var textStyle = style.textStyle || {};
      texts.push({
        id: String(current.id || ""),
        name: current.name || "",
        text: getText(current) || "",
        fontFamily: textStyle.fontFamily || null,
        fontSize: typeof textStyle.fontSize === "number" ? textStyle.fontSize : null,
        fontWeight: textStyle.fontWeight ? String(textStyle.fontWeight) : null,
        color: normalizeColor(textStyle.color || null),
        frame: getFrame(current),
      });
    }

    if (current.layers && current.layers.length > 0) {
      current.layers.forEach(visit);
    }
  }

  visit(layer);
  return texts;
}

function normalizeColor(color) {
  if (!color || typeof color !== "string") {
    return null;
  }

  if (color.indexOf("#") !== 0) {
    return color;
  }

  return color.slice(0, 7).toUpperCase();
}

module.exports = {
  normalizeLayer: normalizeLayer,
  collectTexts: collectTexts,
  getFrame: getFrame,
  normalizeColor: normalizeColor,
  shouldIgnoreLayer: shouldIgnoreLayer,
};
