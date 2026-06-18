const exporter = require("./exporter");
const pluginSettings = require("../sketch/settings");
const i18n = require("../i18n/i18n");
const normalize = require("../sketch/normalize-layer");
const artboardUtils = require("../sketch/artboard-utils");
const progress = require("../ui/export-progress");
const indexGenerator = require("./document-index-generator");
const exportResultWriter = require("../utils/export-result-writer");

import type { ArtboardExportRecordDto, ExportResultWarningDto } from "../types/runtime";
import { buildArtboardRecord, computeArtboardOutputDir, relativePath } from "./export-record";
import type {
  ArtboardGroup,
  ExportMode,
  ExportSingleArtboardOptions,
  FinalizeExportOptions,
  FlatArtboardEntry,
  SafeRunContextLike,
  EmptyExportResultOptions,
} from "./export-types";
import { errorMessage } from "./export-types";
import { getModeLabel, showFailureSummary, showNoArtboardMessage, showSuccessSummary } from "../ui/export-summary-dialog";

export function collectGroupsForMode(document: SketchDocumentLike, mode: ExportMode): ArtboardGroup[] {
  if (mode === "selected") {
    const artboards: SketchLayerLike[] = artboardUtils.getArtboardsFromSelection(document);
    if (artboards.length === 0 || !document.selectedPage) {
      return [];
    }
    return [{ page: document.selectedPage, artboards: artboards }];
  }

  if (mode === "currentPage") {
    const currentPage = document.selectedPage;
    if (!currentPage) {
      return [];
    }
    const currentArtboards: SketchLayerLike[] = artboardUtils.collectVisibleArtboards(currentPage);
    return [{ page: currentPage, artboards: currentArtboards }];
  }

  if (mode === "wholeDocument") {
    return artboardUtils.getDocumentArtboardGroups(document);
  }

  return [];
}

export function exportSingleArtboard(options: ExportSingleArtboardOptions): ArtboardExportRecordDto {
  const document = options.document;
  const settings = options.settings;
  const rootOutputDir = options.rootOutputDir;
  const page = options.page;
  const artboard = options.artboard;
  const pageIndex = options.pageIndex;
  const artboardInPageIndex = options.artboardInPageIndex;
  const reporter = options.reporter;
  const logger = options.logger;

  const outputDir = computeArtboardOutputDir(rootOutputDir, page, artboard, pageIndex, artboardInPageIndex);
  const shortId = normalize.shortHash(String(artboard.id || ""));
  const record = buildArtboardRecord({
    rootOutputDir: rootOutputDir,
    outputDir: outputDir,
    page: page,
    artboard: artboard,
    pageIndex: pageIndex,
    artboardInPageIndex: artboardInPageIndex,
    shortId: shortId,
    status: "pending",
  });

  try {
    logger.step("开始导出画板", "开始导出单个画板", {
      pageName: page && page.name,
      artboardName: artboard.name,
      outputDir: outputDir,
    });
    const exported = exporter.exportArtboard(document, artboard, {
      pluginVersion: options.pluginVersion,
      settings: settings,
      outputDir: outputDir,
      pageName: page && page.name,
      logger: logger,
      onProgress: function (key: string, name: string) {
        reporter.step(key, name);
      },
    });
    const exportedDir = typeof exported === "string" ? exported : exported.outputDir;
    const warnings: string[] = exported && exported.warnings ? exported.warnings : [];
    reporter.success(artboard, exportedDir);

    record.status = "success";
    record.outputDir = exportedDir;
    record.warnings = warnings;
    const screenshotAbs = exporter.fileExists(exporter.joinPath(exportedDir, "screenshot.png"))
      ? exporter.joinPath(exportedDir, "screenshot.png")
      : null;
    record.screenshotPath = screenshotAbs ? relativePath(rootOutputDir, screenshotAbs) : null;
    record.previewHtmlPath = relativePath(rootOutputDir, exporter.joinPath(exportedDir, "preview.html"));
    record.packageDir = relativePath(rootOutputDir, exportedDir);
    logger.info("导出完成", "单个画板导出成功", {
      artboardName: artboard.name,
      outputDir: exportedDir,
      warningCount: warnings.length,
    });
  } catch (error) {
    record.status = "failed";
    record.reason = errorMessage(error);
    record.warnings = [];
    reporter.failure(artboard, error);
    logger.error("导出失败", "单个画板导出失败", error, {
      pageName: page && page.name,
      artboardName: artboard.name,
      outputDir: outputDir,
    });
  }

  return record;
}

export function runExport(
  document: SketchDocumentLike,
  mode: ExportMode,
  groups: ArtboardGroup[],
  context: SafeRunContextLike,
  pluginVersion: string,
) {
  const logger = context.logger;
  logger.step("读取设置", "读取插件导出设置");
  const settings = context.settings || pluginSettings.getSettings();
  logger.step("获取当前文档", "已获取当前 Sketch 文档", {
    documentName: document.name || "Untitled",
    documentPath: document.path ? String(document.path) : null,
  });
  logger.step("获取当前 Page", "已获取当前 Page", {
    pageName: document.selectedPage ? document.selectedPage.name : "",
  });
  const documentName = exporter.sanitizeName(document.name || "Untitled");
  const rootOutputDir = exporter.joinPath(settings.outputRoot, documentName);
  logger.step("创建输出目录", "创建导出根目录", { rootOutputDir: rootOutputDir });
  exporter.ensureDirRecursive(rootOutputDir);

  const reporter = progress.createReporter();
  try {
    reporter.begin(mode, context.logPath);

    logger.step("收集 Artboard", "开始收集导出画板", { mode: mode });
    const flat: FlatArtboardEntry[] = artboardUtils.flattenGroups(groups);
    reporter.collected(flat.length);
    if (flat.length === 0) {
      writeEmptyExportResult({
        document: document,
        mode: mode,
        rootOutputDir: rootOutputDir,
        context: context,
        reason: "未识别到可导出的画板",
      });
      reporter.close();
      showNoArtboardMessage(mode);
      return null;
    }
    logger.info("收集 Artboard", "画板收集完成", { count: flat.length });

    if (mode === "currentPage" && flat.length === 1) {
      reporter.raw(i18n.STRINGS.singleArtboardHint);
    }

    const pageIndexMap: Record<string, number> = {};
    groups.forEach(function (group: ArtboardGroup, index: number) {
      pageIndexMap[String((group.page && group.page.id) || "")] = index;
    });

    const pageCounter: Record<string, number> = {};
    const records: ArtboardExportRecordDto[] = [];
    flat.forEach(function (entry: FlatArtboardEntry, i: number) {
      const page = entry.page;
      const artboard = entry.artboard;
      const pageId = String((page && page.id) || "");
      const pageIndex = pageIndexMap[pageId] !== undefined ? pageIndexMap[pageId] : 0;
      if (pageCounter[pageId] === undefined) {
        pageCounter[pageId] = 0;
      }
      const artboardInPageIndex = pageCounter[pageId];
      pageCounter[pageId] += 1;

      reporter.startArtboard(i + 1, flat.length, artboard.name);

      const record = exportSingleArtboard({
        document: document,
        settings: settings,
        rootOutputDir: rootOutputDir,
        page: page,
        artboard: artboard,
        pageIndex: pageIndex,
        artboardInPageIndex: artboardInPageIndex,
        reporter: reporter,
        logger: logger,
        pluginVersion: pluginVersion,
      });
      records.push(record);
    });

    return finalizeExport({
      document: document,
      mode: mode,
      groups: groups,
      rootOutputDir: rootOutputDir,
      records: records,
      reporter: reporter,
      context: context,
    });
  } catch (error) {
    reporter.close();
    throw error;
  }
}

export function finalizeExport(options: FinalizeExportOptions) {
  const document = options.document;
  const mode = options.mode;
  const groups = options.groups;
  const rootOutputDir = options.rootOutputDir;
  const records = options.records;
  const reporter = options.reporter;
  const context = options.context;
  const logger = context.logger;
  const modeLabel = getModeLabel(mode);

  reporter.generatingIndex();
  logger.step("generate document index", "开始生成文档级索引", { rootOutputDir: rootOutputDir });
  const exportedAt = new Date().toISOString();
  const indexObject = indexGenerator.buildIndexObject({
    documentName: document.name || "Untitled",
    exportedAt: exportedAt,
    mode: mode,
    outputRoot: rootOutputDir,
    records: records,
    warnings: [],
    errors: records
      .filter(function (record: ArtboardExportRecordDto) {
        return record.status === "failed";
      })
      .map(function (record: ArtboardExportRecordDto) {
        return { artboardName: record.artboardName, reason: record.reason };
      }),
  });
  exporter.writeJson(rootOutputDir, "handoff-index.json", indexObject);
  try {
    const indexHtml = indexGenerator.generateIndexHtml(indexObject, modeLabel);
    exporter.writeText(rootOutputDir, "index.html", indexHtml);
  } catch (error) {
    reporter.warning("index.html 生成失败：" + errorMessage(error));
    logger.warn("write html files", "index.html 生成失败", { error: errorMessage(error) });
  }

  const success = records.filter(function (record: ArtboardExportRecordDto) {
    return record.status === "success";
  }).length;
  const failed = records.filter(function (record: ArtboardExportRecordDto) {
    return record.status === "failed";
  }).length;
  const warnings: ExportResultWarningDto[] = exportResultWriter.collectWarnings(records);
  const errors = exportResultWriter.collectErrors(records, []);
  logger.step("write export result", "开始写入 export-result.json", {
    success: success,
    failed: failed,
    warningCount: warnings.length,
  });
  const exportResult = exportResultWriter.buildExportResult({
    mode: mode,
    startedAt: context.startedAt,
    finishedAt: new Date().toISOString(),
    documentName: document.name || "Untitled",
    pageName: document.selectedPage ? document.selectedPage.name : "",
    outputRoot: rootOutputDir,
    items: records,
    warnings: warnings,
    errors: errors,
    logPath: context.logPath,
  });
  exportResultWriter.writeExportResult(rootOutputDir, exportResult);
  logger.info("导出完成", "导出流程完成", exportResult);
  reporter.finish(success, failed);

  if (failed > 0) {
    showFailureSummary({
      mode: mode,
      modeLabel: modeLabel,
      records: records,
      rootOutputDir: rootOutputDir,
      logPath: context.logPath,
      success: success,
      failed: failed,
      warnings: warnings.length,
      stage: logger.getStage(),
    });
  } else {
    showSuccessSummary({
      mode: mode,
      modeLabel: modeLabel,
      groups: groups,
      records: records,
      rootOutputDir: rootOutputDir,
      logPath: context.logPath,
      success: success,
      failed: failed,
      warnings: warnings.length,
    });
  }

  return { rootOutputDir: rootOutputDir, records: records, indexObject: indexObject, exportResult: exportResult };
}

export function writeEmptyExportResult(options: EmptyExportResultOptions): void {
  const result = exportResultWriter.buildExportResult({
    mode: options.mode,
    startedAt: options.context.startedAt,
    finishedAt: new Date().toISOString(),
    documentName: options.document.name || "Untitled",
    pageName: options.document.selectedPage ? options.document.selectedPage.name : "",
    outputRoot: options.rootOutputDir,
    items: [],
    warnings: [{ message: options.reason }],
    errors: [],
    logPath: options.context.logPath,
  });
  exportResultWriter.writeExportResult(options.rootOutputDir, result);
  options.context.logger.warn("收集 Artboard", options.reason, result);
}
