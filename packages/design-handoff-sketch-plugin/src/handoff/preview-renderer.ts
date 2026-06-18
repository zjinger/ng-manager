// @ts-nocheck
var HIT_LAYER_ROLES = {
  navigation: 1,
  sidebar: 1,
  toolbar: 1,
  menu: 1,
  button: 1,
  input: 1,
  select: 1,
  form: 1,
  table: 1,
  list: 1,
  card: 1,
  modal: 1,
  drawer: 1,
  tabs: 1,
  breadcrumb: 1,
  chart: 1,
  text: 1,
};

function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function num(value) {
  var n = Number(value);
  return isFinite(n) ? String(n) : "0";
}

function px(value) {
  return num(value) + "px";
}

function getStyle(styleMap, node) {
  if (!node || !node.styleRef || !styleMap) {
    return null;
  }
  return styleMap[node.styleRef] || null;
}

function getAssetMap(assetsMap) {
  var result = {};
  ((assetsMap && assetsMap.assets) || []).forEach(function (asset) {
    if (asset && asset.layerId) {
      result[String(asset.layerId)] = asset;
    }
  });
  return result;
}

function cssDeclarations(values) {
  return values.filter(Boolean).join(";");
}

function first(values) {
  return values && values.length > 0 ? values[values.length - 1] : null;
}

function buildShadow(shadows) {
  if (!shadows || shadows.length === 0) {
    return null;
  }
  return shadows
    .map(function (shadow) {
      var inset = shadow.type === "innerShadow" || shadow.type === "inner" ? " inset" : "";
      return px(shadow.x) + " " + px(shadow.y) + " " + px(shadow.blur) + " " + px(shadow.spread) + " " + (shadow.color || "rgba(0,0,0,0.2)") + inset;
    })
    .join(", ");
}

function baseStyle(node, styleMap) {
  var f = node.absoluteFrame || node.frame || {};
  var style = getStyle(styleMap, node);
  var declarations = [
    "position:absolute",
    "left:" + px(f.x),
    "top:" + px(f.y),
    "width:" + px(f.width),
    "height:" + px(f.height),
    "box-sizing:border-box",
    "overflow:hidden",
  ];

  if (style) {
    if (style.opacity !== null && style.opacity !== undefined && style.opacity !== 1) {
      declarations.push("opacity:" + num(style.opacity));
    }
    if (style.radius !== null && style.radius !== undefined) {
      declarations.push("border-radius:" + px(style.radius));
    }
    var shadow = buildShadow(style.shadows);
    if (shadow) {
      declarations.push("box-shadow:" + shadow);
    }
  }

  return declarations;
}

function visualStyle(node, styleMap) {
  var style = getStyle(styleMap, node);
  var declarations = baseStyle(node, styleMap);
  if (style) {
    var fill = first(style.fills);
    if (fill) {
      declarations.push("background:" + fill);
    }
    var border = first(style.borders);
    if (border) {
      declarations.push("border:1px solid " + border);
    }
  }
  return declarations;
}

function textStyle(node, styleMap) {
  var style = getStyle(styleMap, node);
  var declarations = visualStyle(node, styleMap);
  declarations.push("white-space:pre-wrap");
  declarations.push("line-height:1.25");
  declarations.push("display:flex");
  declarations.push("align-items:flex-start");
  declarations.push("color:#17202a");
  if (style) {
    if (style.fontFamily) {
      declarations.push("font-family:" + JSON.stringify(style.fontFamily) + ", -apple-system, BlinkMacSystemFont, 'PingFang SC', sans-serif");
    }
    if (style.fontSize) {
      declarations.push("font-size:" + px(style.fontSize));
    }
    if (style.fontWeight) {
      declarations.push("font-weight:" + String(style.fontWeight));
    }
  }
  return declarations;
}

function dataAttrs(node, kind) {
  return (
    ' data-handoff-id="' + escapeHtml(node.handoffId || node.id) + '"' +
    ' data-layer-id="' + escapeHtml(node.id) + '"' +
    ' data-artboard-id="' + escapeHtml(node.artboardId || "") + '"' +
    ' data-handoff-type="' + escapeHtml(kind || node.type || "layer") + '"' +
    ' data-handoff-name="' + escapeHtml(node.name || "") + '"'
  );
}

function renderNode(node, styleMap, assetsByLayerId, output) {
  if (!node || node.hidden || node.type === "Artboard") {
    return;
  }

  var asset = assetsByLayerId[String(node.id || "")];
  if (asset && asset.path) {
    output.push(
      '<img class="ngm-layer ngm-image"' +
        dataAttrs(node, "image") +
        ' src="' + escapeHtml(asset.path) + '"' +
        ' alt="' + escapeHtml(node.name || "") + '"' +
        ' style="' + cssDeclarations(baseStyle(node, styleMap)) + '">',
    );
  } else if (node.type === "Text") {
    output.push(
      '<div class="ngm-layer ngm-text"' +
        dataAttrs(node, "text") +
        ' style="' + cssDeclarations(textStyle(node, styleMap)) + '">' +
        escapeHtml(node.text || node.name || "") +
        "</div>",
    );
  } else {
    var style = getStyle(styleMap, node);
    var hasVisualStyle = style && ((style.fills && style.fills.length) || (style.borders && style.borders.length) || style.radius !== null || (style.shadows && style.shadows.length));
    if (hasVisualStyle || node.type === "Shape" || node.type === "ShapePath" || node.role === "button" || node.role === "input" || node.role === "card" || node.role === "modal") {
      output.push(
        '<div class="ngm-layer ngm-shape"' +
          dataAttrs(node, node.role || "shape") +
          ' style="' + cssDeclarations(visualStyle(node, styleMap)) + '"></div>',
      );
    }
  }

  if (node.children && node.children.length > 0) {
    node.children.forEach(function (child) {
      renderNode(child, styleMap, assetsByLayerId, output);
    });
  }
}

function generatePreviewHtml(meta, layerTree, components, screenshot, styleMap, assetsMap) {
  var stage = (layerTree && (layerTree.absoluteFrame || layerTree.frame)) || { width: 0, height: 0 };
  var width = num(stage.width);
  var height = num(stage.height);
  var layers = [];
  renderNode(layerTree, styleMap || {}, getAssetMap(assetsMap), layers);

  var fallback = screenshot
    ? '<img class="ngm-screenshot-fallback" src="screenshot.png" alt="' + escapeHtml(meta && meta.artboardName) + '">'
    : "";

  var title = "NGM Handoff Preview - " + (meta && meta.artboardName ? meta.artboardName : "Artboard");

  return [
    "<!DOCTYPE html>",
    '<html lang="zh">',
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    "<title>" + escapeHtml(title) + "</title>",
    "<style>",
    "  * { box-sizing:border-box; }",
    '  body { margin:0; background:#f5f5f5; font-family: -apple-system, "PingFang SC", sans-serif; }',
    "  .ngm-preview-tip { padding:8px 12px; color:#666; font-size:12px; background:#fff; border-bottom:1px solid #eee; }",
    "  .ngm-preview-stage { position: relative; margin: 0 auto; background:#fff; overflow:hidden; }",
    "  .ngm-layer { transform-origin:center center; }",
    "  .ngm-image { display:block; object-fit:fill; }",
    "  .ngm-shape { pointer-events:auto; }",
    "  .ngm-text { pointer-events:auto; word-break:break-word; }",
    "  .ngm-screenshot-fallback { display:none; }",
    "  .ngm-layer:hover { outline:1px dashed rgba(59,130,246,0.6); outline-offset:-1px; }",
    '  [data-ngm-handoff-selected="true"] { outline:2px solid #3b82f6 !important; outline-offset:2px !important; box-shadow:0 0 0 4px rgba(59,130,246,0.2) !important; }',
    "</style>",
    "</head>",
    "<body>",
    '<div class="ngm-preview-tip">NGM Design Handoff Preview · 点击节点联动 Handoff 面板</div>',
    '<div class="ngm-preview-stage" style="width:' + width + 'px;height:' + height + 'px;">',
    "  " + fallback,
    "  " + layers.join("\n  "),
    "</div>",
    '<script src="interaction-bridge.js"></script>',
    "</body>",
    "</html>",
    "",
  ].join("\n");
}

module.exports = {
  generatePreviewHtml: generatePreviewHtml,
};

