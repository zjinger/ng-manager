const sketch = require("sketch");
const UI = require("sketch/ui");
const exporter = require("./export/exporter");
const pluginSettings = require("./sketch/settings");
const i18n = require("./i18n/i18n");
const normalize = require("./sketch/normalize-layer");
const artboardUtils = require("./sketch/artboard-utils");
const progress = require("./ui/export-progress");
const scopeDialog = require("./ui/export-scope-dialog");
const indexGenerator = require("./export/document-index-generator");
const safeRunModule = require("./utils/safe-run");
const diagnostics = require("./utils/diagnostics");
const scanPage = require("./utils/scan-page");
const exportResultWriter = require("./utils/export-result-writer");

import type {
  ArtboardExportRecordDto,
  DocumentIndexDto,
  ExportResultWarningDto,
} from "./types/runtime";

const PLUGIN_VERSION = "0.3.0";

type ExportMode = "selected" | "currentPage" | "wholeDocument" | "custom";

interface ArtboardGroup {
  page: SketchPageLike;
  artboards: SketchLayerLike[];
}

interface FlatArtboardEntry {
  page: SketchPageLike;
  artboard: SketchLayerLike;
}

interface PluginSettingsDto {
  outputRoot: string;
  exportScreenshot?: boolean;
}

interface ExportLoggerLike {
  logPath?: string;
  getStage(): string;
  step(stage: string, message: string, data?: unknown): unknown;
  info(stage: string, message: string, data?: unknown): unknown;
  warn(stage: string, message: string, data?: unknown): unknown;
  error(stage: string, message: string, error: unknown, data?: unknown): unknown;
}

interface ExportReporterLike {
  begin(): void;
  close(): void;
  collected(total: number): void;
  raw(message: string): void;
  startArtboard(current: number, total: number, artboardName?: string): void;
  step(key: string, name?: string): void;
  success(artboard: SketchLayerLike, outputDir: string): void;
  failure(artboard: SketchLayerLike, error: unknown): void;
  warning(message: string): void;
  generatingIndex(): void;
  finish(success: number, failed: number): void;
  renderLog(): string;
}

interface SafeRunContextLike {
  startedAt?: string;
  settings?: PluginSettingsDto;
  logger: ExportLoggerLike;
  logPath?: string;
}

interface BuildArtboardRecordOptions {
  rootOutputDir: string;
  outputDir: string;
  page: SketchPageLike;
  artboard: SketchLayerLike;
  pageIndex: number;
  artboardInPageIndex: number;
  shortId: string;
  status: ArtboardExportRecordDto["status"];
  reason?: string | null;
}

interface ExportSingleArtboardOptions {
  document: SketchDocumentLike;
  settings: PluginSettingsDto;
  rootOutputDir: string;
  page: SketchPageLike;
  artboard: SketchLayerLike;
  pageIndex: number;
  artboardInPageIndex: number;
  reporter: ExportReporterLike;
  logger: ExportLoggerLike;
}

interface FinalizeExportOptions {
  document: SketchDocumentLike;
  mode: ExportMode;
  groups: ArtboardGroup[];
  rootOutputDir: string;
  records: ArtboardExportRecordDto[];
  reporter: ExportReporterLike;
  context: SafeRunContextLike;
}

interface EmptyExportResultOptions {
  document: SketchDocumentLike;
  mode: ExportMode;
  rootOutputDir: string;
  context: SafeRunContextLike;
  reason: string;
}

interface ExportSummaryOptions {
  mode: ExportMode;
  modeLabel: string;
  groups?: ArtboardGroup[];
  records: ArtboardExportRecordDto[];
  rootOutputDir: string;
  logPath?: string;
  success: number;
  failed: number;
  warnings: number;
  stage?: string;
}

function errorMessage(error: unknown): string {
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message?: unknown }).message);
  }
  return String(error);
}

// ============================================================
// 基础工具
// ============================================================

function getDocument(): SketchDocumentLike | undefined {
  return sketch.getSelectedDocument();
}

function getModeLabel(mode: ExportMode | string): string {
  if (mode === "selected") {
    return i18n.STRINGS.modeSelected;
  }
  if (mode === "currentPage") {
    return i18n.STRINGS.modeCurrentPage;
  }
  if (mode === "wholeDocument") {
    return i18n.STRINGS.modeWholeDocument;
  }
  if (mode === "custom") {
    return i18n.STRINGS.modeCustom;
  }
  return mode;
}

function relativePath(rootDir: string | null | undefined, absPath: string | null | undefined): string {
  if (!rootDir || !absPath) {
    return absPath || "";
  }
  const root = String(rootDir).replace(/\/+$/g, "");
  const abs = String(absPath);
  if (abs.indexOf(root + "/") === 0) {
    return abs.slice(root.length + 1);
  }
  if (abs === root) {
    return "";
  }
  return abs;
}


// ============================================================
// 根据模式收集画板分组
// groups: [{ page, artboards }]
// ============================================================

function collectGroupsForMode(document: SketchDocumentLike, mode: ExportMode): ArtboardGroup[] {
  if (mode === "selected") {
    const artboards: SketchLayerLike[] = artboardUtils.getArtboardsFromSelection(document);
    if (artboards.length === 0) {
      return [];
    }
    const page = document.selectedPage;
    if (!page) {
      return [];
    }
    return [{ page: page, artboards: artboards }];
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


// ============================================================
// 单个画板导出（带分页目录命名 / 进度回调 / 结果记录）
// ============================================================

// 计算每个画板的唯一输出目录，避免同名覆盖。
function computeArtboardOutputDir(rootOutputDir: string, page: SketchPageLike, artboard: SketchLayerLike, pageIndex: number, artboardInPageIndex: number): string {
  const pageName = exporter.sanitizeName(page && page.name ? page.name : "Page");
  const artboardName = exporter.sanitizeName(artboard.name || "Untitled Artboard");
  const shortId = normalize.shortHash(String(artboard.id || ""));
  const pageDirName = "page-" + indexGenerator.pad3(pageIndex + 1) + "-" + pageName;
  const abDirName =
    "artboard-" +
    indexGenerator.pad3(artboardInPageIndex + 1) +
    "-" +
    artboardName +
    "__" +
    shortId;
  return exporter.joinPath(rootOutputDir, pageDirName, abDirName);
}

// 构造文档级索引用的扁平 record。路径一律相对 rootOutputDir。
function buildArtboardRecord(options: BuildArtboardRecordOptions): ArtboardExportRecordDto {
  const relPackageDir = relativePath(options.rootOutputDir, options.outputDir);
  return {
    pageIndex: options.pageIndex,
    pageId: String((options.page && options.page.id) || ""),
    pageName: (options.page && options.page.name) || "",
    artboardIndex: options.artboardInPageIndex,
    shortId: options.shortId,
    artboardName: options.artboard.name || "",
    packageDir: relPackageDir,
    screenshotPath: null,
    previewHtmlPath: null,
    status: options.status,
    reason: options.reason || null,
    warnings: [],
    outputDir: options.outputDir,
  };
}

function exportSingleArtboard(options: ExportSingleArtboardOptions): ArtboardExportRecordDto {
  let document = options.document;
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
      pluginVersion: PLUGIN_VERSION,
      settings: settings,
      outputDir: outputDir,
      pageName: page && page.name,
      logger: logger,
      onProgress: function (key: string, name: string) {
        reporter.step(key, name);
      },
    });
    const exportedDir = typeof exported === "string" ? exported : exported.outputDir;
    const warnings = exported && exported.warnings ? exported.warnings : [];
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


// ============================================================
// 统一导出工作流
// ============================================================

function runExport(document: SketchDocumentLike, mode: ExportMode, groups: ArtboardGroup[], context: SafeRunContextLike) {
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
    reporter.begin();

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

    // 对 "导出当前页面" 且只识别到 1 个画板的情况给出额外提示。
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

function finalizeExport(options: FinalizeExportOptions) {
  let document = options.document;
  const mode = options.mode;
  const groups = options.groups;
  const rootOutputDir = options.rootOutputDir;
  const records = options.records;
  const reporter = options.reporter;
  const context = options.context;
  const logger = context.logger;
  const modeLabel = getModeLabel(mode);

  // 生成文档级索引
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
      .filter(function (r: ArtboardExportRecordDto) {
        return r.status === "failed";
      })
      .map(function (r: ArtboardExportRecordDto) {
        return { artboardName: r.artboardName, reason: r.reason };
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

  // 汇总
  const success = records.filter(function (r: ArtboardExportRecordDto) {
    return r.status === "success";
  }).length;
  const failed = records.filter(function (r: ArtboardExportRecordDto) {
    return r.status === "failed";
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

function writeEmptyExportResult(options: EmptyExportResultOptions): void {
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


// ============================================================
// 导出日志
// ============================================================

function buildExportLogText(options: {
  document: SketchDocumentLike;
  records: ArtboardExportRecordDto[];
  reporter: ExportReporterLike;
  indexObject: DocumentIndexDto;
  exportedAt: string;
  modeLabel: string;
  rootOutputDir: string;
}): string {
  const lines: string[] = [];
  let document = options.document;
  const records = options.records;
  const reporter = options.reporter;
  const indexObject = options.indexObject;

  lines.push("NGM AI Handoff 导出日志");
  lines.push("=============================");
  lines.push("导出时间：" + options.exportedAt);
  lines.push("导出模式：" + options.modeLabel);
  lines.push("文档名：" + (document.name || "Untitled"));
  lines.push("文档路径：" + (document.path ? String(document.path) : "（未保存）"));
  lines.push("输出根目录：" + options.rootOutputDir);
  lines.push("Page 数：" + indexObject.pages.length);
  lines.push("Artboard 数：" + indexObject.artboards.length);
  lines.push("");
  lines.push("---- 导出进度 ----");
  lines.push(reporter.renderLog());
  lines.push("");
  lines.push("---- 成功列表 ----");
  records
    .filter(function (r: ArtboardExportRecordDto) {
      return r.status === "success";
    })
    .forEach(function (r: ArtboardExportRecordDto) {
      lines.push("- " + r.pageName + " / " + r.artboardName + " -> " + r.outputDir);
    });
  lines.push("");
  lines.push("---- 失败列表 ----");
  records
    .filter(function (r: ArtboardExportRecordDto) {
      return r.status === "failed";
    })
    .forEach(function (r: ArtboardExportRecordDto) {
      lines.push("- " + r.pageName + " / " + r.artboardName + "，原因：" + (r.reason || "unknown"));
    });
  lines.push("");
  lines.push("---- Warning 列表 ----");
  if (!indexObject.warnings || indexObject.warnings.length === 0) {
    lines.push("（无）");
  } else {
    indexObject.warnings.forEach(function (w: string) {
      lines.push("- " + w);
    });
  }
  lines.push("");
  return lines.join("\n") + "\n";
}

// ============================================================
// 摘要弹窗
// ============================================================

function showSuccessSummary(options: ExportSummaryOptions): void {
  const alert = NSAlert.alloc().init();
  alert.setMessageText(i18n.STRINGS.summary.title);

  const pageNames = (options.groups || []).map(function (g: ArtboardGroup) {
    return (g.page && g.page.name) || "";
  });

  const informative =
    i18n.STRINGS.summary.mode + "：" + options.modeLabel + "\n" +
    i18n.STRINGS.summary.pages + "：" + (options.groups ? options.groups.length : 0) +
    "（" + pageNames.join("、") + "）\n" +
    i18n.STRINGS.summary.artboards + "：" + options.records.length + "\n" +
    i18n.STRINGS.summary.success + "：" + options.success + "\n" +
    i18n.STRINGS.summary.failed + "：" + options.failed + "\n" +
    i18n.STRINGS.summary.warnings + "：" + (options.warnings || 0) + "\n" +
    i18n.STRINGS.summary.outputRoot + "：" + options.rootOutputDir + "\n" +
    i18n.STRINGS.safeRun.logPath + "：" + options.logPath;
  alert.setInformativeText(informative);
  alert.addButtonWithTitle(i18n.STRINGS.summary.openInFinder);
  alert.addButtonWithTitle(i18n.STRINGS.summary.close);

  const response = alert.runModal();
  const firstButton = typeof NSAlertFirstButtonReturn !== "undefined" ? NSAlertFirstButtonReturn : 1000;
  if (response === firstButton) {
    revealInFinder(options.rootOutputDir);
  }
}

function showFailureSummary(options: ExportSummaryOptions): void {
  const records = options.records || [];
  const failures = records.filter(function (r: ArtboardExportRecordDto) {
    return r.status === "failed";
  });

  const failureLines = failures.map(function (r: ArtboardExportRecordDto) {
    return (
      "- " +
      i18n.STRINGS.failure.failedArtboard +
      "：" +
      r.artboardName +
      "\n  " +
      i18n.STRINGS.failure.reason +
      "：" +
      (r.reason || "unknown")
    );
  });

  const informative = [
    i18n.STRINGS.failure.intro,
    "",
    i18n.STRINGS.summary.mode + "：" + options.modeLabel,
    i18n.STRINGS.failure.succeededCount + "：" + options.success,
    i18n.STRINGS.summary.failed + "：" + options.failed,
    i18n.STRINGS.summary.warnings + "：" + (options.warnings || 0),
    i18n.STRINGS.safeRun.stage + "：" + (options.stage || ""),
    i18n.STRINGS.failure.partialFiles + "：" + (options.success > 0 ? i18n.STRINGS.yes : i18n.STRINGS.no),
    "",
    failureLines.join("\n"),
    "",
    i18n.t("failure.logHint", { path: options.logPath }),
  ];
  const alert = NSAlert.alloc().init();
  alert.setMessageText(i18n.STRINGS.failure.title);
  alert.setInformativeText(informative.join("\n"));
  alert.addButtonWithTitle(i18n.STRINGS.summary.openInFinder);
  alert.addButtonWithTitle(i18n.STRINGS.summary.close);

  const response = alert.runModal();
  const firstButton = typeof NSAlertFirstButtonReturn !== "undefined" ? NSAlertFirstButtonReturn : 1000;
  if (response === firstButton) {
    revealInFinder(options.rootOutputDir);
  }
}

function revealInFinder(path: string): void {
  const targetPath = String(path || "");
  try {
    const url = NSURL.fileURLWithPath(targetPath);
    NSWorkspace.sharedWorkspace().activateFileViewerSelectingURLs(NSArray.arrayWithObject(url));
    return;
  } catch (error) {
    try {
      NSWorkspace.sharedWorkspace().openURL(NSURL.fileURLWithPath(targetPath));
      return;
    } catch (innerError) {
      UI.message(i18n.t("summary.openFinderFailed", { path: targetPath }));
    }
  }
}

function showNoArtboardMessage(mode: ExportMode): void {
  if (mode === "selected") {
    UI.alert(i18n.STRINGS.noArtboardFound, i18n.STRINGS.noArtboardFoundHint);
    return;
  }
  if (mode === "currentPage") {
    UI.message(i18n.STRINGS.pluginName + " · " + i18n.STRINGS.noVisibleArtboards);
    return;
  }
  if (mode === "wholeDocument") {
    UI.message(i18n.STRINGS.pluginName + " · " + i18n.STRINGS.noArtboardsInDocument);
    return;
  }
  if (mode === "custom") {
    UI.message(i18n.STRINGS.pluginName + " · " + i18n.STRINGS.noArtboardsSelected);
    return;
  }
}

// ============================================================
// Handler 入口
// ============================================================

function onExportSelectedArtboard() {
  return safeRunModule.safeRun({ command: "export-selected-artboard", commandLabel: i18n.STRINGS.modeSelected }, function (context: SafeRunContextLike) {
    context.logger.step("获取当前文档", "准备获取当前文档");
    let document = getDocument();
    if (!document) {
      throw new Error(i18n.STRINGS.noDocument);
    }
    const groups = collectGroupsForMode(document, "selected");
    if (groups.length === 0) {
      showNoArtboardMessage("selected");
      return null;
    }
    return runExport(document, "selected", groups, context);
  });
}

function onExportCurrentPage() {
  return safeRunModule.safeRun({ command: "export-current-page", commandLabel: i18n.STRINGS.modeCurrentPage }, function (context: SafeRunContextLike) {
    context.logger.step("获取当前文档", "准备获取当前文档");
    let document = getDocument();
    if (!document) {
      throw new Error(i18n.STRINGS.noDocument);
    }
    const groups = collectGroupsForMode(document, "currentPage");
    if (groups.length === 0 || groups[0].artboards.length === 0) {
      showNoArtboardMessage("currentPage");
      return null;
    }
    return runExport(document, "currentPage", groups, context);
  });
}

function onExportWholeDocument() {
  return safeRunModule.safeRun({ command: "export-whole-document", commandLabel: i18n.STRINGS.modeWholeDocument }, function (context: SafeRunContextLike) {
    context.logger.step("获取当前文档", "准备获取当前文档");
    let document = getDocument();
    if (!document) {
      throw new Error(i18n.STRINGS.noDocument);
    }
    const groups = collectGroupsForMode(document, "wholeDocument");
    if (groups.length === 0) {
      showNoArtboardMessage("wholeDocument");
      return null;
    }
    return runExport(document, "wholeDocument", groups, context);
  });
}

function onExportCustom() {
  return safeRunModule.safeRun({ command: "export-custom", commandLabel: i18n.STRINGS.modeCustom }, function (context: SafeRunContextLike) {
    context.logger.step("获取当前文档", "准备获取当前文档");
    let document = getDocument();
    if (!document) {
      throw new Error(i18n.STRINGS.noDocument);
    }
    const allGroups = artboardUtils.getDocumentArtboardGroups(document);
    if (allGroups.length === 0) {
      showNoArtboardMessage("wholeDocument");
      return null;
    }
    const entries: FlatArtboardEntry[] = artboardUtils.flattenGroups(allGroups);
    let selection = scopeDialog.showCustomScopeDialog(entries);
    if (!selection || selection.length === 0) {
      showNoArtboardMessage("custom");
      return null;
    }
    const groups = artboardUtils.filterGroupsBySelection(allGroups, selection);
    if (groups.length === 0) {
      showNoArtboardMessage("custom");
      return null;
    }
    return runExport(document, "custom", groups, context);
  });
}

function onOpenSettings() {
  return safeRunModule.safeRun({ command: "open-settings", commandLabel: i18n.STRINGS.settings.title }, function () {
    pluginSettings.configureSettings();
  });
}

function onDiagnosePluginEnvironment() {
  return safeRunModule.safeRun({ command: "diagnose-plugin-environment", commandLabel: i18n.STRINGS.diagnostics.menu }, function (context: SafeRunContextLike) {
    return diagnostics.runDiagnostics(context, { pluginVersion: PLUGIN_VERSION });
  });
}

function onScanCurrentPage() {
  return safeRunModule.safeRun({ command: "scan-current-page", commandLabel: i18n.STRINGS.scan.menu }, function (context: SafeRunContextLike) {
    return scanPage.runScanCurrentPage(context);
  });
}

module.exports = {
  onExportSelectedArtboard: onExportSelectedArtboard,
  onExportCurrentPage: onExportCurrentPage,
  onExportWholeDocument: onExportWholeDocument,
  onExportCustom: onExportCustom,
  onOpenSettings: onOpenSettings,
  onDiagnosePluginEnvironment: onDiagnosePluginEnvironment,
  onScanCurrentPage: onScanCurrentPage,
};

export {};
