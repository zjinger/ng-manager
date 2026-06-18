// 临时验证脚本：仅在 Node 中运行纯 JS 辅助模块，不依赖 Sketch/CocoaScript 运行时。
// 用于在 Windows CI 环境下对新文件做语法 + 行为冒烟测试。
const path = require("path");
// 由于 Contents/Sketch 不再保留业务散件 JS（phase1_refactor3），
// 冒烟测试改为直接 require tsc 编译产物 lib/src 下的模块。
const libDir = path.join(__dirname, "..", "lib", "src");

const i18n = require(path.join(libDir, "i18n", "i18n.js"));
const artboardUtils = require(path.join(libDir, "sketch", "artboard-utils.js"));
const classify = require(path.join(libDir, "export", "asset-classify.js"));
const indexGenerator = require(path.join(libDir, "export", "document-index-generator.js"));
const debugLogger = require(path.join(libDir, "utils", "debug-logger.js"));
const exportResultWriter = require(path.join(libDir, "utils", "export-result-writer.js"));
const diagnostics = require(path.join(libDir, "utils", "diagnostics.js"));
const scanPage = require(path.join(libDir, "utils", "scan-page.js"));

let failures = 0;

function assertEqual(label, actual, expected) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    failures += 1;
    console.error(`  [FAIL] ${label}`);
    console.error(`    expected: ${JSON.stringify(expected)}`);
    console.error(`    actual:   ${JSON.stringify(actual)}`);
  } else {
    console.log(`  [OK]   ${label}`);
  }
}

function assertTruthy(label, value) {
  if (!value) {
    failures += 1;
    console.error(`  [FAIL] ${label} should be truthy, got: ${JSON.stringify(value)}`);
  } else {
    console.log(`  [OK]   ${label}`);
  }
}

// i18n
console.log("\n[i18n]");
assertTruthy("pluginName 不为空", i18n.STRINGS.pluginName);
assertEqual("format 替换",
  i18n.format("正在导出第 {index} / {total} 个：{name}", { index: 3, total: 12, name: "登录页" }),
  "正在导出第 3 / 12 个：登录页",
);
assertEqual("t 路径访问深层文案", i18n.t("summary.title"), "导出完成");
assertEqual("t 带变量",
  i18n.t("exportingProgress", { index: 1, total: 5, name: "首页" }),
  "正在导出第 1 / 5 个画板：首页",
);
assertEqual("t 缺失路径返回原路径", i18n.t("missing.path"), "missing.path");
assertEqual("新增诊断菜单文案", i18n.t("diagnostics.menu"), "诊断插件环境");
assertEqual("新增扫描菜单文案", i18n.t("scan.menu"), "扫描当前页面");

// artboard-utils
console.log("\n[artboard-utils]");
assertTruthy("isArtboard 正例", artboardUtils.isArtboard({ type: "Artboard" }));
assertTruthy("isArtboard 反例", !artboardUtils.isArtboard({ type: "Group" }));
assertTruthy("isArtboard null", !artboardUtils.isArtboard(null));

assertEqual("collectVisibleArtboards 过滤隐藏与 Group",
  artboardUtils.collectVisibleArtboards({
    layers: [
      { type: "Artboard", id: "ab1", name: "A", hidden: false },
      { type: "Artboard", id: "ab2", name: "B", hidden: true },
      { type: "Group", id: "g1", name: "G" },
    ],
  }).map(function (a) { return a.id; }),
  ["ab1"],
);

assertEqual("flattenGroups 保留顺序",
  artboardUtils.flattenGroups([
    { page: { id: "p1", name: "页面1" }, artboards: [{ id: "ab1", name: "A" }, { id: "ab2", name: "B" }] },
    { page: { id: "p2", name: "页面2" }, artboards: [{ id: "ab3", name: "C" }] },
  ]).map(function (entry) { return entry.artboard.id; }),
  ["ab1", "ab2", "ab3"],
);

assertEqual("filterGroupsBySelection 保留分组结构",
  artboardUtils.filterGroupsBySelection(
    [
      { page: { id: "p1" }, artboards: [{ id: "ab1" }, { id: "ab2" }] },
      { page: { id: "p2" }, artboards: [{ id: "ab3" }] },
    ],
    [{ pageId: "p1", artboardId: "ab2" }, { pageId: "p2", artboardId: "ab3" }],
  ).map(function (g) {
    return { pageId: g.page.id, artboards: g.artboards.map(function (a) { return a.id; }) };
  }),
  [
    { pageId: "p1", artboards: ["ab2"] },
    { pageId: "p2", artboards: ["ab3"] },
  ],
);

assertEqual("getDocumentArtboardGroups 跳过无可见画板的 Page",
  artboardUtils.getDocumentArtboardGroups({
    pages: [
      { id: "p1", name: "P1", layers: [{ type: "Artboard", id: "ab1", hidden: false }] },
      { id: "p2", name: "P2", layers: [{ type: "Group", id: "g1" }] },
    ],
  }).map(function (g) { return g.page.id; }),
  ["p1"],
);

assertEqual("getArtboardsFromSelection 自动去重父级画板",
  artboardUtils.getArtboardsFromSelection({
    selectedLayers: {
      layers: [
        { type: "Artboard", id: "AB1", name: "登录页" },
        { type: "Artboard", id: "AB1", name: "登录页" },
        { type: "Artboard", id: "AB2", name: "首页" },
      ],
    },
  }).map(function (a) { return a.id; }),
  ["AB1", "AB2"],
);


// asset-classify
console.log("\n[asset-classify]");
assertEqual("Slice -> slice", classify.classifyAsset({ type: "Slice", name: "cut" }).type, "slice");
assertEqual("Bitmap -> bitmap", classify.classifyAsset({ type: "Bitmap", name: "bg" }).type, "bitmap");
assertEqual("Image -> bitmap", classify.classifyAsset({ type: "Image", name: "photo" }).type, "bitmap");
assertEqual("logo 命名 -> logo", classify.classifyAsset({ type: "Group", name: "brand logo", frame: { x:0,y:0,width:64,height:24 } }).type, "logo");
assertEqual("icon 命名 -> icon", classify.classifyAsset({ type: "Shape", name: "search icon", frame: { x:0,y:0,width:24,height:24 } }).type, "icon");
assertEqual("svg 命名 -> icon", classify.classifyAsset({ type: "Shape", name: "arrow-svg", frame: { x:0,y:0,width:16,height:16 } }).type, "icon");
assertEqual("SymbolInstance -> symbol", classify.classifyAsset({ type: "SymbolInstance", name: "Button/Primary" }).type, "symbol");
assertEqual("小尺寸 Group + ShapePath -> icon", classify.classifyAsset({
  type: "Group",
  name: "Actions",
  frame: { x: 0, y: 0, width: 24, height: 24 },
  layers: [{ type: "ShapePath" }, { type: "ShapePath" }],
}).type, "icon");
assertEqual("小尺寸 ShapePath -> vector", classify.classifyAsset({ type: "ShapePath", name: "line", frame: { x:0,y:0,width:12,height:12 } }).type, "vector");
assertEqual("大尺寸 ShapePath 不当资源", classify.classifyAsset({ type: "ShapePath", name: "bg shape", frame: { x:0,y:0,width:500,height:300 } }), null);
assertEqual("exportable -> exportable", classify.classifyAsset({ type: "Rectangle", name: "x", exportFormats: [{ format: "png" }] }).type, "exportable");
assertEqual("asset type 目录映射",
  [
    classify.assetTypeDirectory("bitmap"),
    classify.assetTypeDirectory("image"),
    classify.assetTypeDirectory("slice"),
    classify.assetTypeDirectory("icon"),
    classify.assetTypeDirectory("logo"),
    classify.assetTypeDirectory("symbol"),
    classify.assetTypeDirectory("vector"),
    classify.assetTypeDirectory("misc"),
    classify.assetTypeDirectory("exportable"),
    classify.assetTypeDirectory("unknown"),
  ],
  ["images", "images", "slices", "icons", "icons", "symbols", "vectors", "misc", "misc", "misc"],
);
assertTruthy("preferSvg icon", classify.preferSvg("icon"));
assertTruthy("preferSvg vector", classify.preferSvg("vector"));
assertTruthy("preferSvg logo", classify.preferSvg("logo"));
assertTruthy("not preferSvg bitmap", !classify.preferSvg("bitmap"));

// preview modules
console.log("\n[preview]");
const previewData = require(path.join(libDir, "handoff", "preview-data-generator.js"));
const previewTemplate = require(path.join(libDir, "handoff", "preview-template.js"));
const previewCss = require(path.join(libDir, "handoff", "preview-css.js"));
const previewJs = require(path.join(libDir, "handoff", "preview-js.js"));

var previewMeta = { artboardName: "登录页" };
var previewLayerTree = {
  id: "ab1", handoffId: "artboard_1", name: "登录页", type: "Artboard",
  artboardId: "artboard_1",
  frame: { x: 0, y: 0, width: 375, height: 667 },
  absoluteFrame: { x: 0, y: 0, width: 375, height: 667 },
  children: [
    { id: "t1", handoffId: "layer_t1", name: "title", type: "Text", artboardId: "artboard_1",
      frame: { x: 20, y: 60, width: 200, height: 24 },
      absoluteFrame: { x: 20, y: 60, width: 200, height: 24 },
      text: "Welcome", styleRef: "s1" },
  ],
};
var previewStyleMap = {
  s1: { fontSize: 18, fontFamily: "PingFang SC" },
};
var previewAssets = {
  assets: [
    { id: "a1", layerId: "b1", name: "search", type: "icon", format: "svg", path: "assets/icons/icon-001-search__a1b2.svg", width: 24, height: 24, exportStatus: "success" },
  ],
};
var previewDataJson = previewData.generatePreviewData(previewMeta, previewLayerTree, [], null, previewStyleMap, previewAssets);
assertEqual("preview-data has artboard", !!previewDataJson.artboard, true);
assertEqual("preview-data nodes.length", previewDataJson.nodes.length, 1);
assertEqual("preview-data assets.length", previewDataJson.assets.length, 1);
assertEqual("preview-data node text", previewDataJson.nodes[0].text, "Welcome");
assertEqual("preview-data asset path", previewDataJson.assets[0].path, "assets/icons/icon-001-search__a1b2.svg");

var previewHtml = previewTemplate.generatePreviewHtml(previewMeta, previewLayerTree, [], "screenshot.png", previewStyleMap, previewAssets, previewDataJson);
assertTruthy("preview.html includes layer tree panel", previewHtml.indexOf("图层树") > -1);
assertTruthy("preview.html includes inspect panel", previewHtml.indexOf("Inspect") > -1);
assertTruthy("preview.html includes assets panel", previewHtml.indexOf("资源") > -1);
assertTruthy("preview.html includes screenshot toggle", previewHtml.indexOf("ngm-toggle-screenshot") > -1);
assertTruthy("preview.html references preview.css", previewHtml.indexOf("preview.css") > -1);
assertTruthy("preview.html references preview.js", previewHtml.indexOf("preview.js") > -1);
assertTruthy("preview.html injects __NGM_PREVIEW_DATA__", previewHtml.indexOf("__NGM_PREVIEW_DATA__") > -1);

var cssText = previewCss.generatePreviewCss();
assertTruthy("preview.css includes inspect-panel", cssText.indexOf(".ngm-inspect-panel") > -1);
assertTruthy("preview.css includes layer-tree", cssText.indexOf(".ngm-layer-tree") > -1);
assertTruthy("preview.css includes assets-panel", cssText.indexOf(".ngm-assets-panel") > -1);

var jsText = previewJs.generatePreviewJs();
assertTruthy("preview.js includes ngm-handoff:select", jsText.indexOf("ngm-handoff:select") > -1);
assertTruthy("preview.js includes ngm-handoff:highlight", jsText.indexOf("ngm-handoff:highlight") > -1);
assertTruthy("preview.js includes renderLayerTree", jsText.indexOf("renderLayerTree") > -1);
assertTruthy("preview.js includes renderInspect", jsText.indexOf("renderInspect") > -1);
assertTruthy("preview.js includes renderAssets", jsText.indexOf("renderAssets") > -1);

// document-index-generator
console.log("\n[document-index-generator]");
assertEqual("pad3 三位补齐", indexGenerator.pad3(7), "007");
assertEqual("pad3 >=100 不补齐", indexGenerator.pad3(42), "042");

var records = [
  {
    pageIndex: 0,
    pageId: "P1",
    pageName: "0-登录页",
    artboardIndex: 0,
    shortId: "abc12345",
    artboardName: "登录页-手机",
    packageDir: "page-001-0-登录页/artboard-001-登录页-手机__abc12345",
    screenshotPath: "page-001-0-登录页/artboard-001-登录页-手机__abc12345/screenshot.png",
    previewHtmlPath: "page-001-0-登录页/artboard-001-登录页-手机__abc12345/preview.html",
    status: "success",
    reason: null,
  },
  {
    pageIndex: 0,
    pageId: "P1",
    pageName: "0-登录页",
    artboardIndex: 1,
    shortId: "def67890",
    artboardName: "登录页-验证",
    packageDir: "page-001-0-登录页/artboard-002-登录页-验证__def67890",
    screenshotPath: null,
    previewHtmlPath: "page-001-0-登录页/artboard-002-登录页-验证__def67890/preview.html",
    status: "failed",
    reason: "no exportable layers",
  },
];

var index = indexGenerator.buildIndexObject({
  documentName: "demo.sketch",
  exportedAt: "2026-06-18T00:00:00.000Z",
  mode: "wholeDocument",
  outputRoot: "/tmp/demo.sketch",
  records: records,
  warnings: [],
  errors: [],
});

assertEqual("index pages.length", index.pages.length, 1);
assertEqual("index artboards.length", index.artboards.length, 2);
assertEqual("index pages[0].artboards.length", index.pages[0].artboards.length, 2);
assertEqual("index summary 统计",
  index.summary,
  { pageTotal: 1, artboardTotal: 2, successTotal: 1, failedTotal: 1, warningTotal: 0 },
);
assertTruthy("index.html 包含画板名",
  indexGenerator.generateIndexHtml(index, "导出整个文档").indexOf("登录页-手机") > -1,
);
assertTruthy("index.html 包含模式标签",
  indexGenerator.generateIndexHtml(index, "导出整个文档").indexOf("导出整个文档") > -1,
);

// debug-logger
console.log("\n[debug-logger]");
const entry = debugLogger.buildLogEntry({
  time: "2026-06-18T00:00:00.000Z",
  level: "step",
  command: "扫描当前页面",
  stage: "扫描当前页面",
  message: "开始扫描",
  data: { count: 2 },
});
assertEqual("buildLogEntry 字段",
  {
    time: entry.time,
    level: entry.level,
    command: entry.command,
    stage: entry.stage,
    message: entry.message,
    data: entry.data,
    error: entry.error,
  },
  {
    time: "2026-06-18T00:00:00.000Z",
    level: "step",
    command: "扫描当前页面",
    stage: "扫描当前页面",
    message: "开始扫描",
    data: { count: 2 },
    error: null,
  },
);
const fallbackLogPath = debugLogger.joinPath(debugLogger.getFallbackOutputRoot(), "logs", "ngm-ai-handoff.log");
assertTruthy("fallback log path", fallbackLogPath.indexOf("ngm-ai-handoff.log") > -1);

// export-result-writer
console.log("\n[export-result-writer]");
const exportResult = exportResultWriter.buildExportResult({
  mode: "currentPage",
  startedAt: "2026-06-18T00:00:00.000Z",
  finishedAt: "2026-06-18T00:00:01.500Z",
  documentName: "demo.sketch",
  pageName: "首页",
  outputRoot: "/tmp/demo",
  logPath: "/tmp/demo/logs/ngm-ai-handoff.log",
  items: [
    { artboardName: "A", status: "success", warnings: ["warn"] },
    { artboardName: "B", status: "failed", reason: "boom", warnings: [] },
  ],
});
assertEqual("export-result 统计",
  {
    totalArtboards: exportResult.totalArtboards,
    successCount: exportResult.successCount,
    failedCount: exportResult.failedCount,
    warningCount: exportResult.warnings.length,
    errorCount: exportResult.errors.length,
    durationMs: exportResult.durationMs,
  },
  {
    totalArtboards: 2,
    successCount: 1,
    failedCount: 1,
    warningCount: 1,
    errorCount: 1,
    durationMs: 1500,
  },
);

// diagnostics
console.log("\n[diagnostics]");
const diagnosticsResult = diagnostics.buildDiagnosticsResult({
  pluginVersion: "0.3.0",
  logPath: "/tmp/log",
  settings: { outputRoot: "/tmp/out" },
  checkWritable: false,
  document: {
    name: "demo.sketch",
    path: "/tmp/demo.sketch",
    selectedPage: {
      name: "首页",
      layers: [
        { id: "ab1", name: "A", type: "Artboard", hidden: false, locked: false, frame: { x: 1, y: 2, width: 3, height: 4 } },
        { id: "g1", name: "G", type: "Group", hidden: false },
      ],
    },
    selectedLayers: { layers: [{ id: "l1", name: "Layer", type: "Text", hidden: false, locked: false }] },
  },
});
assertEqual("diagnostics 摘要",
  {
    documentName: diagnosticsResult.documentName,
    selectedPageName: diagnosticsResult.selectedPageName,
    selectedLayerCount: diagnosticsResult.selectedLayerCount,
    visibleArtboardCount: diagnosticsResult.visibleArtboardCount,
  },
  {
    documentName: "demo.sketch",
    selectedPageName: "首页",
    selectedLayerCount: 1,
    visibleArtboardCount: 1,
  },
);

// scan-page
console.log("\n[scan-page]");
const scanResult = scanPage.buildScanResult({
  outputRoot: "/tmp/out",
  logPath: "/tmp/log",
  document: {
    name: "demo.sketch",
    selectedPage: {
      name: "首页",
      layers: [
        { id: "ab1", name: "A", type: "Artboard", hidden: false, locked: false },
        { id: "ab2", name: "B", type: "Artboard", hidden: true, locked: false },
        { id: "g1", name: "G", type: "Group" },
      ],
    },
  },
});
assertEqual("scan-page 统计",
  {
    artboardCount: scanResult.artboardCount,
    visibleArtboardCount: scanResult.visibleArtboardCount,
    hiddenArtboardCount: scanResult.hiddenArtboardCount,
  },
  {
    artboardCount: 2,
    visibleArtboardCount: 1,
    hiddenArtboardCount: 1,
  },
);

// 结果汇总
console.log("");
if (failures === 0) {
  console.log("ALL PASSED");
  process.exit(0);
} else {
  console.error(`${failures} assertion(s) failed`);
  process.exit(1);
}
