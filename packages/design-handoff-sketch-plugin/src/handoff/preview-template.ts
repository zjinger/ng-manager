// @ts-nocheck
// 生成 Pure HTML Preview v2 的完整页面模板。
// 页面包含：顶部工具栏、左侧图层树、中间 Stage + screenshot 对照层、右侧 Inspect / 资源面板。

function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function generatePreviewHtml(meta, layerTree, components, screenshot, styleMap, assetsMap, previewDataJson, options) {
  options = options || {};
  var title = "NGM Handoff Preview - " + (meta && meta.artboardName ? meta.artboardName : "Artboard");
  var artboard = previewDataJson && previewDataJson.artboard ? previewDataJson.artboard : { width: 0, height: 0 };
  var stageWidth = artboard.width || 0;
  var stageHeight = artboard.height || 0;
  var screenshotHtml = screenshot
    ? '<div class="ngm-screenshot-layer"><img src="screenshot.png" alt="' + escapeHtml(meta && meta.artboardName) + '"></div>'
    : '<div class="ngm-screenshot-layer"></div>';

  return [
    "<!DOCTYPE html>",
    '<html lang="zh">',
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    "<title>" + escapeHtml(title) + "</title>",
    '<link rel="stylesheet" href="preview.css">',
    "</head>",
    "<body>",
    '<div class="ngm-preview-root">',
    '  <div class="ngm-preview-header">',
    '    <div class="ngm-preview-title">' + escapeHtml(title) + "</div>",
    '    <div class="ngm-preview-toolbar">',
    '      <button id="ngm-toggle-screenshot">对照 screenshot</button>',
    '      <span>' + stageWidth + " × " + stageHeight + " px</span>",
    "    </div>",
    "  </div>",
    '  <div class="ngm-preview-body">',
    '    <div class="ngm-panel ngm-layer-tree">',
    '      <div class="ngm-panel-title">图层树</div>',
    '      <div class="ngm-panel-content"><ul></ul></div>',
    "    </div>",
    '    <div class="ngm-panel ngm-stage-panel">',
    '      <div class="ngm-stage-wrapper">',
    '        <div class="ngm-stage-content">',
    screenshotHtml,
    "        </div>",
    "      </div>",
    "    </div>",
    '    <div class="ngm-panel ngm-inspect-panel">',
    '      <div class="ngm-panel-title">Inspect</div>',
    '      <div class="ngm-panel-content"><div class="ngm-empty-state">点击图层查看详情</div></div>',
    "    </div>",
    '    <div class="ngm-panel ngm-assets-panel">',
    '      <div class="ngm-panel-title">资源</div>',
    '      <div class="ngm-panel-content"></div>',
    "    </div>",
    "  </div>",
    "</div>",
    '  <script>',
    '    window.__NGM_PREVIEW_DATA__ = ' + JSON.stringify(previewDataJson) + ';',
    '  </script>',
    '  <script src="interaction-bridge.js"></script>',
    '  <script src="preview.js"></script>',
    "</body>",
    "</html>",
    "",
  ].join("\n");
}

module.exports = {
  generatePreviewHtml: generatePreviewHtml,
};
