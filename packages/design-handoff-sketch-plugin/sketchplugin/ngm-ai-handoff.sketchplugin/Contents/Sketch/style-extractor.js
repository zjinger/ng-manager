"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var normalize = require("./normalize-layer");
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
function extractStyle(layer) {
    var style = layer.style || {};
    var textStyle = style.textStyle || {};
    return {
        fills: enabledItems(style.fills)
            .map(function (fill) {
            return colorToHex(fill.color);
        })
            .filter(Boolean),
        borders: enabledItems(style.borders)
            .map(function (border) {
            return colorToHex(border.color);
        })
            .filter(Boolean),
        radius: extractRadius(layer),
        opacity: typeof style.opacity === "number" ? style.opacity : 1,
        shadows: enabledItems(style.shadows).map(function (shadow) {
            return {
                type: shadow.type || "shadow",
                color: colorToHex(shadow.color),
                x: Number(shadow.x) || 0,
                y: Number(shadow.y) || 0,
                blur: Number(shadow.blur) || 0,
                spread: Number(shadow.spread) || 0,
            };
        }),
        fontFamily: textStyle.fontFamily || null,
        fontSize: typeof textStyle.fontSize === "number" ? textStyle.fontSize : null,
        fontWeight: textStyle.fontWeight ? String(textStyle.fontWeight) : null,
    };
}
function hasMeaningfulStyle(style) {
    return (style.fills.length > 0 ||
        style.borders.length > 0 ||
        style.radius !== null ||
        style.opacity !== 1 ||
        style.shadows.length > 0 ||
        style.fontFamily !== null ||
        style.fontSize !== null ||
        style.fontWeight !== null);
}
function createStyleRegistry() {
    var styles = {};
    var keyToId = {};
    var count = 0;
    return {
        styles: styles,
        register: function (layer) {
            var style = extractStyle(layer);
            if (!hasMeaningfulStyle(style)) {
                return null;
            }
            var key = JSON.stringify(style);
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
    var colors = [];
    var fontSizes = [];
    var radii = [];
    Object.keys(styles).forEach(function (styleId) {
        var style = styles[styleId];
        style.fills.forEach(function (color) {
            pushUnique(colors, color);
        });
        style.borders.forEach(function (color) {
            pushUnique(colors, color);
        });
        if (style.radius !== null) {
            pushUnique(radii, style.radius);
        }
        if (style.fontSize !== null) {
            pushUnique(fontSizes, style.fontSize);
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
