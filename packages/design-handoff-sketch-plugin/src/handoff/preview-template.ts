// 生成 Pure HTML Preview v2 的完整页面模板。
// 页面包含：顶部工具栏、左侧图层树、中间 Stage + screenshot 对照层、右侧 Inspect / 资源面板。

import type { AssetsMapDto, HandoffLayerNodeDto } from "../types/runtime";

interface MetaLike {
  artboardName?: string;
}

interface PreviewDataLike {
  artboard?: {
    width?: number;
    height?: number;
  };
}

function escapeHtml(value: unknown): string {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function safeJsonScript(value: unknown): string {
  return JSON.stringify(value || {}).replace(/<\//g, "<\\/");
}

export function generatePreviewHtml(
  meta: MetaLike,
  layerTree: HandoffLayerNodeDto,
  components: unknown[],
  screenshot: string | null,
  styleMap: unknown,
  assetsMap: AssetsMapDto,
  previewDataJson: PreviewDataLike,
  options?: Record<string, unknown>,
): string {
  options = options || {};
  const title = "NGM Handoff Preview - " + (meta && meta.artboardName ? meta.artboardName : "Artboard");
  const artboard = previewDataJson && previewDataJson.artboard ? previewDataJson.artboard : { width: 0, height: 0 };
  const stageWidth = artboard.width || 0;
  const stageHeight = artboard.height || 0;
  const screenshotHtml = screenshot
    ? '<div class="ngm-screenshot-layer"><img src="screenshot.png" alt="' + escapeHtml(meta && meta.artboardName) + '"></div>'
    : '<div class="ngm-screenshot-layer ngm-screenshot-missing">未导出 screenshot.png</div>';

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
    '      <button id="ngm-toggle-screenshot" class="active">显示截图</button>',
    '      <button id="ngm-toggle-hotspots" class="active">显示热区</button>',
    '      <button id="ngm-reset-zoom">适配窗口</button>',
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
    '          <div class="ngm-hotspot-layer"></div>',
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
    '    window.__NGM_PREVIEW_DATA__ = ' + safeJsonScript(previewDataJson) + ';',
    '  </script>',
    '  <script src="interaction-bridge.js"></script>',
    '  <script src="preview.js"></script>',
    "</body>",
    "</html>",
    "",
  ].join("\n");
  void layerTree;
  void components;
  void styleMap;
  void assetsMap;
  void options;
}
