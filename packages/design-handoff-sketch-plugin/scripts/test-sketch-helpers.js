// 临时验证脚本：仅在 Node 中运行纯 JS 辅助模块，不依赖 Sketch/CocoaScript 运行时。
// 用于在 Windows CI 环境下对新文件做语法 + 行为冒烟测试。
const path = require("path");
const sketchDir = path.join(
  __dirname,
  "..",
  "sketchplugin",
  "ngm-ai-handoff.sketchplugin",
  "Contents",
  "Sketch",
);

const i18n = require(path.join(sketchDir, "i18n.js"));
const artboardUtils = require(path.join(sketchDir, "artboard-utils.js"));
const indexGenerator = require(path.join(sketchDir, "document-index-generator.js"));
const debugLogger = require(path.join(sketchDir, "debug-logger.js"));
const exportResultWriter = require(path.join(sketchDir, "export-result-writer.js"));
const diagnostics = require(path.join(sketchDir, "diagnostics.js"));
const scanPage = require(path.join(sketchDir, "scan-page.js"));

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
