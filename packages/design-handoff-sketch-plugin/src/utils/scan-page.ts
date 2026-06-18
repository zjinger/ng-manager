let sketch: SketchRuntimeModule = null as unknown as SketchRuntimeModule;
try {
  sketch = require("sketch");
} catch (error) {
  sketch = { getSelectedDocument: function () { return undefined; } };
}
const i18n = require("../i18n/i18n");
const debugLogger = require("./debug-logger");
const nativeAlert = require("../runtime/native-alert");

import type { RectDto } from "../types/runtime";
import type { SafeRunContextLike } from "../export/export-types";

interface PageArtboardSummaryDto {
  id: string;
  name: string;
  hidden: boolean;
  locked: boolean;
  frame: RectDto | null;
}

interface ScanInput {
  document?: SketchDocumentLike | null;
  outputRoot?: string;
  logPath?: string;
}

interface ScanResultDto {
  scannedAt: string;
  documentName: string;
  documentPath: string | null;
  pageName: string;
  artboardCount: number;
  visibleArtboardCount: number;
  hiddenArtboardCount: number;
  artboards: PageArtboardSummaryDto[];
  outputRoot: string;
  logPath: string;
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

export function collectPageArtboards(page: SketchPageLike | undefined | null): PageArtboardSummaryDto[] {
  if (!page || !page.layers) {
    return [];
  }
  return page.layers
    .filter(function (layer: SketchLayerLike) {
      return layer && layer.type === "Artboard";
    })
    .map(function (artboard: SketchLayerLike) {
      return {
        id: String(artboard.id || ""),
        name: String(artboard.name || ""),
        hidden: Boolean(artboard.hidden),
        locked: Boolean(artboard.locked),
        frame: getFrame(artboard),
      };
    });
}

export function buildScanResult(input: ScanInput): ScanResultDto {
  let document = input.document || null;
  let page = document && document.selectedPage ? document.selectedPage : null;
  let artboards = collectPageArtboards(page);
  let visibleArtboards = artboards.filter(function (item: PageArtboardSummaryDto) {
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

function showScanSummary(result: ScanResultDto, outputPath: string): void {
  nativeAlert.showNativeAlert({
    title: i18n.STRINGS.scan.title,
    message: [
      i18n.STRINGS.scan.page + "：" + (result.pageName || i18n.STRINGS.none),
      i18n.STRINGS.scan.total + "：" + result.artboardCount,
      i18n.STRINGS.scan.visible + "：" + result.visibleArtboardCount,
      i18n.STRINGS.scan.hidden + "：" + result.hiddenArtboardCount,
      i18n.STRINGS.scan.resultPath + "：" + outputPath,
      i18n.STRINGS.safeRun.logPath + "：" + result.logPath,
    ].join("\n"),
    buttons: [i18n.STRINGS.summary.close],
  });
}

export function runScanCurrentPage(context: SafeRunContextLike): ScanResultDto {
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
