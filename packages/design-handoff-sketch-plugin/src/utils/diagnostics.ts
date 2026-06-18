let sketch: SketchRuntimeModule = null as unknown as SketchRuntimeModule;
try {
  sketch = require("sketch");
} catch (error) {
  sketch = { getSelectedDocument: function () { return undefined; } };
}
const i18n = require("../i18n/i18n");
const artboardUtils = require("../sketch/artboard-utils");
const debugLogger = require("./debug-logger");
const nativeAlert = require("../runtime/native-alert");

import type { RectDto } from "../types/runtime";
import type { SafeRunContextLike } from "../export/export-types";

interface DiagnosticsOptions {
  pluginVersion?: string;
}

interface DiagnosticsInput {
  document?: SketchDocumentLike | null;
  settings?: { outputRoot?: string | null } | null;
  logPath?: string;
  pluginVersion?: string;
  checkWritable?: boolean;
}

interface LayerSummaryDto {
  id: string;
  name: string;
  type: string;
  hidden: boolean;
  locked: boolean;
  frame: RectDto | null;
}

interface DiagnosticsResultDto {
  pluginVersion?: string;
  sketchVersion: string;
  documentName: string;
  documentPath: string | null;
  selectedPageName: string;
  selectedLayerCount: number;
  selectedLayers: LayerSummaryDto[];
  visibleArtboardCount: number;
  visibleArtboards: LayerSummaryDto[];
  outputRoot: string;
  outputRootWritable: boolean;
  logPath: string;
}

function getSketchVersion(): string {
  try {
    if (typeof NSBundle !== "undefined") {
      let bundle = NSBundle.mainBundle();
      let value = bundle.objectForInfoDictionaryKey("CFBundleShortVersionString");
      return value ? String(value) : "";
    }
  } catch (error) {
    return "";
  }
  return "";
}

function getFrame(layer: SketchLayerLike | undefined | null): RectDto | null {
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

export function summarizeLayer(layer: SketchLayerLike | undefined | null): LayerSummaryDto {
  return {
    id: String((layer && layer.id) || ""),
    name: String((layer && layer.name) || ""),
    type: String((layer && layer.type) || ""),
    hidden: Boolean(layer && layer.hidden),
    locked: Boolean(layer && layer.locked),
    frame: getFrame(layer),
  };
}

export function buildDiagnosticsResult(input: DiagnosticsInput): DiagnosticsResultDto {
  let document = input.document || null;
  let page = document && document.selectedPage ? document.selectedPage : null;
  let selectedLayers = document && document.selectedLayers ? document.selectedLayers.layers || [] : [];
  let visibleArtboards = artboardUtils.collectVisibleArtboards(page);
  let outputRoot = input.settings && input.settings.outputRoot ? input.settings.outputRoot : "";
  let shouldCheckWritable = input.checkWritable !== false;

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

function showDiagnosticsSummary(result: DiagnosticsResultDto, outputPath: string): void {
  nativeAlert.showNativeAlert({
    title: i18n.STRINGS.diagnostics.title,
    message: [
      i18n.STRINGS.diagnostics.document + "：" + (result.documentName || i18n.STRINGS.none),
      i18n.STRINGS.diagnostics.page + "：" + (result.selectedPageName || i18n.STRINGS.none),
      i18n.STRINGS.diagnostics.selectedLayers + "：" + result.selectedLayerCount,
      i18n.STRINGS.diagnostics.visibleArtboards + "：" + result.visibleArtboardCount,
      i18n.STRINGS.diagnostics.outputRoot + "：" + (result.outputRoot || i18n.STRINGS.none),
      i18n.STRINGS.diagnostics.outputWritable + "：" + (result.outputRootWritable ? i18n.STRINGS.yes : i18n.STRINGS.no),
      i18n.STRINGS.safeRun.logPath + "：" + result.logPath,
      i18n.STRINGS.diagnostics.resultPath + "：" + outputPath,
    ].join("\n"),
    buttons: [i18n.STRINGS.summary.close],
  });
}

export function runDiagnostics(context: SafeRunContextLike, options?: DiagnosticsOptions): DiagnosticsResultDto {
  options = options || {};
  context.logger.step("诊断环境", "开始诊断插件环境");
  let document = sketch.getSelectedDocument();
  let result = buildDiagnosticsResult({
    document: document,
    settings: context.settings,
    logPath: context.logPath,
    pluginVersion: options.pluginVersion,
    checkWritable: true,
  });
  let outputRoot = result.outputRoot || debugLogger.getFallbackOutputRoot();
  result.outputRoot = outputRoot;
  result.outputRootWritable = debugLogger.isDirectoryWritable(outputRoot);
  debugLogger.ensureDirRecursive(outputRoot);
  let outputPath = debugLogger.joinPath(outputRoot, "diagnostics-result.json");
  debugLogger.writeJsonFile(outputRoot, "diagnostics-result.json", result);
  context.logger.info("诊断环境", "诊断结果已写入", { outputPath: outputPath, result: result });
  showDiagnosticsSummary(result, outputPath);
  return result;
}
