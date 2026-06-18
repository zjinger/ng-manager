var sketch = null;
try {
    sketch = require("sketch");
}
catch (error) {
    sketch = { getSelectedDocument: function () { return null; } };
}
var i18n = require("./i18n");
var artboardUtils = require("./artboard-utils");
var debugLogger = require("./debug-logger");
function getSketchVersion() {
    try {
        if (typeof NSBundle !== "undefined") {
            var bundle = NSBundle.mainBundle();
            var value = bundle.objectForInfoDictionaryKey("CFBundleShortVersionString");
            return value ? String(value) : "";
        }
    }
    catch (error) {
        return "";
    }
    return "";
}
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
function summarizeLayer(layer) {
    return {
        id: String((layer && layer.id) || ""),
        name: String((layer && layer.name) || ""),
        type: String((layer && layer.type) || ""),
        hidden: Boolean(layer && layer.hidden),
        locked: Boolean(layer && layer.locked),
        frame: getFrame(layer),
    };
}
function buildDiagnosticsResult(input) {
    var document = input.document || null;
    var page = document && document.selectedPage ? document.selectedPage : null;
    var selectedLayers = document && document.selectedLayers ? document.selectedLayers.layers || [] : [];
    var visibleArtboards = artboardUtils.collectVisibleArtboards(page);
    var outputRoot = input.settings && input.settings.outputRoot ? input.settings.outputRoot : "";
    var shouldCheckWritable = input.checkWritable !== false;
    return {
        pluginVersion: input.pluginVersion,
        sketchVersion: getSketchVersion(),
        documentName: document ? document.name || "" : "",
        documentPath: document && document.path ? String(document.path) : null,
        selectedPageName: page ? page.name || "" : "",
        selectedLayerCount: selectedLayers.length || 0,
        selectedLayers: selectedLayers.map(summarizeLayer),
        visibleArtboardCount: visibleArtboards.length,
        visibleArtboards: visibleArtboards.map(summarizeLayer),
        outputRoot: outputRoot,
        outputRootWritable: outputRoot && shouldCheckWritable ? debugLogger.isDirectoryWritable(outputRoot) : false,
        logPath: input.logPath || "",
    };
}
function showDiagnosticsSummary(result, outputPath) {
    var alert = NSAlert.alloc().init();
    alert.setMessageText(i18n.STRINGS.diagnostics.title);
    alert.setInformativeText([
        i18n.STRINGS.diagnostics.document + "：" + (result.documentName || i18n.STRINGS.none),
        i18n.STRINGS.diagnostics.page + "：" + (result.selectedPageName || i18n.STRINGS.none),
        i18n.STRINGS.diagnostics.selectedLayers + "：" + result.selectedLayerCount,
        i18n.STRINGS.diagnostics.visibleArtboards + "：" + result.visibleArtboardCount,
        i18n.STRINGS.diagnostics.outputRoot + "：" + (result.outputRoot || i18n.STRINGS.none),
        i18n.STRINGS.diagnostics.outputWritable + "：" + (result.outputRootWritable ? i18n.STRINGS.yes : i18n.STRINGS.no),
        i18n.STRINGS.safeRun.logPath + "：" + result.logPath,
        i18n.STRINGS.diagnostics.resultPath + "：" + outputPath,
    ].join("\n"));
    alert.addButtonWithTitle(i18n.STRINGS.summary.close);
    alert.runModal();
}
function runDiagnostics(context, options) {
    options = options || {};
    context.logger.step("诊断环境", "开始诊断插件环境");
    var document = sketch.getSelectedDocument();
    var result = buildDiagnosticsResult({
        document: document,
        settings: context.settings,
        logPath: context.logPath,
        pluginVersion: options.pluginVersion,
        checkWritable: true,
    });
    var outputRoot = result.outputRoot || debugLogger.getFallbackOutputRoot();
    result.outputRoot = outputRoot;
    result.outputRootWritable = debugLogger.isDirectoryWritable(outputRoot);
    debugLogger.ensureDirRecursive(outputRoot);
    var outputPath = debugLogger.joinPath(outputRoot, "diagnostics-result.json");
    debugLogger.writeJsonFile(outputRoot, "diagnostics-result.json", result);
    context.logger.info("诊断环境", "诊断结果已写入", { outputPath: outputPath, result: result });
    showDiagnosticsSummary(result, outputPath);
    return result;
}
module.exports = {
    buildDiagnosticsResult: buildDiagnosticsResult,
    runDiagnostics: runDiagnostics,
    summarizeLayer: summarizeLayer,
};
