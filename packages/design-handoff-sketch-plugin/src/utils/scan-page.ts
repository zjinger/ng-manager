let sketch = null;
try {
  sketch = require("sketch");
} catch (error) {
  sketch = { getSelectedDocument: function () { return null; } };
}
let i18n = require("../i18n/i18n");
let debugLogger = require("./debug-logger");

function getFrame(layer) {
  if (!layer || !layer.frame) {
    return null;
  }
  return {
    x: Number(layer.frame.x || 0),
    y: Number(layer.frame.y || 0),
    width: Number(layer.frame.width || 0),
    height: Number(layer.frame.height || 0),
  };
}

function collectPageArtboards(page) {
  if (!page || !page.layers) {
    return [];
  }
  return page.layers
    .filter(function (layer) {
      return layer && layer.type === "Artboard";
    })
    .map(function (artboard) {
      return {
        id: String(artboard.id || ""),
        name: String(artboard.name || ""),
        hidden: Boolean(artboard.hidden),
        locked: Boolean(artboard.locked),
        frame: getFrame(artboard),
      };
    });
}

function buildScanResult(input) {
  let document = input.document || null;
  let page = document && document.selectedPage ? document.selectedPage : null;
  let artboards = collectPageArtboards(page);
  let visibleArtboards = artboards.filter(function (item) {
    return !item.hidden;
  });

  return {
    scannedAt: new Date().toISOString(),
    documentName: document ? document.name || "" : "",
    documentPath: document && document.path ? String(document.path) : null,
    pageName: page ? page.name || "" : "",
    artboardCount: artboards.length,
    visibleArtboardCount: visibleArtboards.length,
    hiddenArtboardCount: artboards.length - visibleArtboards.length,
    artboards: artboards,
    outputRoot: input.outputRoot || "",
    logPath: input.logPath || "",
  };
}

function showScanSummary(result, outputPath) {
  let alert = NSAlert.alloc().init();
  alert.setMessageText(i18n.STRINGS.scan.title);
  alert.setInformativeText(
    [
      i18n.STRINGS.scan.page + "：" + (result.pageName || i18n.STRINGS.none),
      i18n.STRINGS.scan.total + "：" + result.artboardCount,
      i18n.STRINGS.scan.visible + "：" + result.visibleArtboardCount,
      i18n.STRINGS.scan.hidden + "：" + result.hiddenArtboardCount,
      i18n.STRINGS.scan.resultPath + "：" + outputPath,
      i18n.STRINGS.safeRun.logPath + "：" + result.logPath,
    ].join("\n"),
  );
  alert.addButtonWithTitle(i18n.STRINGS.summary.close);
  alert.runModal();
}

function runScanCurrentPage(context) {
  context.logger.step("扫描当前页面", "开始扫描当前页面");
  let document = sketch.getSelectedDocument();
  let outputRoot = context.settings && context.settings.outputRoot
    ? context.settings.outputRoot
    : debugLogger.getFallbackOutputRoot();
  debugLogger.ensureDirRecursive(outputRoot);
  let result = buildScanResult({
    document: document,
    outputRoot: outputRoot,
    logPath: context.logPath,
  });
  let outputPath = debugLogger.joinPath(outputRoot, "scan-result.json");
  debugLogger.writeJsonFile(outputRoot, "scan-result.json", result);
  context.logger.info("扫描当前页面", "扫描结果已写入", { outputPath: outputPath, result: result });
  showScanSummary(result, outputPath);
  return result;
}

module.exports = {
  buildScanResult: buildScanResult,
  collectPageArtboards: collectPageArtboards,
  runScanCurrentPage: runScanCurrentPage,
};

export {};
