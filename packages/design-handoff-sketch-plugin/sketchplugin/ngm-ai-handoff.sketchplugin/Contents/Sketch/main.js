"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var sketch = require("sketch");
var UI = require("sketch/ui");
var exporter = require("./exporter");
var pluginSettings = require("./settings");
var i18n = require("./i18n");
var normalize = require("./normalize-layer");
var artboardUtils = require("./artboard-utils");
var progress = require("./export-progress");
var scopeDialog = require("./export-scope-dialog");
var indexGenerator = require("./document-index-generator");
var PLUGIN_VERSION = "0.3.0";
function getDocument() {
    return sketch.getSelectedDocument();
}
function getModeLabel(mode) {
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
function relativePath(rootDir, absPath) {
    if (!rootDir || !absPath) {
        return absPath || "";
    }
    var root = String(rootDir).replace(/\/+$/g, "");
    var abs = String(absPath);
    if (abs.indexOf(root + "/") === 0) {
        return abs.slice(root.length + 1);
    }
    if (abs === root) {
        return "";
    }
    return abs;
}
function collectGroupsForMode(document, mode) {
    if (mode === "selected") {
        var artboards = artboardUtils.getArtboardsFromSelection(document);
        if (artboards.length === 0) {
            return [];
        }
        var page = document.selectedPage;
        return [{ page: page, artboards: artboards }];
    }
    if (mode === "currentPage") {
        var currentPage = document.selectedPage;
        var currentArtboards = artboardUtils.collectVisibleArtboards(currentPage);
        return [{ page: currentPage, artboards: currentArtboards }];
    }
    if (mode === "wholeDocument") {
        return artboardUtils.getDocumentArtboardGroups(document);
    }
    return [];
}
function computeArtboardOutputDir(rootOutputDir, page, artboard, pageIndex, artboardInPageIndex) {
    var pageName = exporter.sanitizeName(page && page.name ? page.name : "Page");
    var artboardName = exporter.sanitizeName(artboard.name || "Untitled Artboard");
    var shortId = normalize.shortHash(String(artboard.id || ""));
    var pageDirName = "page-" + indexGenerator.pad3(pageIndex + 1) + "-" + pageName;
    var abDirName = "artboard-" +
        indexGenerator.pad3(artboardInPageIndex + 1) +
        "-" +
        artboardName +
        "__" +
        shortId;
    return exporter.joinPath(rootOutputDir, pageDirName, abDirName);
}
function buildArtboardRecord(options) {
    var relPackageDir = relativePath(options.rootOutputDir, options.outputDir);
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
        outputDir: options.outputDir,
    };
}
function exportSingleArtboard(options) {
    var document = options.document;
    var settings = options.settings;
    var rootOutputDir = options.rootOutputDir;
    var page = options.page;
    var artboard = options.artboard;
    var pageIndex = options.pageIndex;
    var artboardInPageIndex = options.artboardInPageIndex;
    var reporter = options.reporter;
    var outputDir = computeArtboardOutputDir(rootOutputDir, page, artboard, pageIndex, artboardInPageIndex);
    var shortId = normalize.shortHash(String(artboard.id || ""));
    var record = buildArtboardRecord({
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
        var exportedDir = exporter.exportArtboard(document, artboard, {
            pluginVersion: PLUGIN_VERSION,
            settings: settings,
            outputDir: outputDir,
            pageName: page && page.name,
            onProgress: function (key, name) {
                reporter.step(key, name);
            },
        });
        reporter.success(artboard, exportedDir);
        record.status = "success";
        record.outputDir = exportedDir;
        var screenshotAbs = exporter.fileExists(exporter.joinPath(exportedDir, "screenshot.png"))
            ? exporter.joinPath(exportedDir, "screenshot.png")
            : null;
        record.screenshotPath = screenshotAbs ? relativePath(rootOutputDir, screenshotAbs) : null;
        record.previewHtmlPath = relativePath(rootOutputDir, exporter.joinPath(exportedDir, "preview.html"));
        record.packageDir = relativePath(rootOutputDir, exportedDir);
    }
    catch (error) {
        record.status = "failed";
        record.reason = error && error.message ? error.message : String(error);
        reporter.failure(artboard, error);
    }
    return record;
}
function runExport(document, mode, groups) {
    var settings = pluginSettings.getSettings();
    var documentName = exporter.sanitizeName(document.name || "Untitled");
    var rootOutputDir = exporter.joinPath(settings.outputRoot, documentName);
    exporter.ensureDirRecursive(rootOutputDir);
    var reporter = progress.createReporter();
    reporter.begin();
    var flat = artboardUtils.flattenGroups(groups);
    reporter.collected(flat.length);
    if (flat.length === 0) {
        showNoArtboardMessage(mode);
        return null;
    }
    if (mode === "currentPage" && flat.length === 1) {
        reporter.raw(i18n.STRINGS.singleArtboardHint);
    }
    var pageIndexMap = {};
    groups.forEach(function (group, index) {
        pageIndexMap[String((group.page && group.page.id) || "")] = index;
    });
    var pageCounter = {};
    var records = [];
    flat.forEach(function (entry, i) {
        var page = entry.page;
        var artboard = entry.artboard;
        var pageId = String((page && page.id) || "");
        var pageIndex = pageIndexMap[pageId] !== undefined ? pageIndexMap[pageId] : 0;
        if (pageCounter[pageId] === undefined) {
            pageCounter[pageId] = 0;
        }
        var artboardInPageIndex = pageCounter[pageId];
        pageCounter[pageId] += 1;
        reporter.startArtboard(i + 1, flat.length, artboard.name);
        var record = exportSingleArtboard({
            document: document,
            settings: settings,
            rootOutputDir: rootOutputDir,
            page: page,
            artboard: artboard,
            pageIndex: pageIndex,
            artboardInPageIndex: artboardInPageIndex,
            reporter: reporter,
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
    });
}
function finalizeExport(options) {
    var document = options.document;
    var mode = options.mode;
    var groups = options.groups;
    var rootOutputDir = options.rootOutputDir;
    var records = options.records;
    var reporter = options.reporter;
    var modeLabel = getModeLabel(mode);
    reporter.generatingIndex();
    var exportedAt = new Date().toISOString();
    var indexObject = indexGenerator.buildIndexObject({
        documentName: document.name || "Untitled",
        exportedAt: exportedAt,
        mode: mode,
        outputRoot: rootOutputDir,
        records: records,
        warnings: [],
        errors: records
            .filter(function (r) {
            return r.status === "failed";
        })
            .map(function (r) {
            return { artboardName: r.artboardName, reason: r.reason };
        }),
    });
    exporter.writeJson(rootOutputDir, "handoff-index.json", indexObject);
    try {
        var indexHtml = indexGenerator.generateIndexHtml(indexObject, modeLabel);
        exporter.writeText(rootOutputDir, "index.html", indexHtml);
    }
    catch (error) {
        reporter.warning("index.html 生成失败：" + (error && error.message ? error.message : String(error)));
    }
    reporter.writingLog();
    var logPath = exporter.joinPath(rootOutputDir, "ngm-handoff-export.log");
    var logText = buildExportLogText({
        document: document,
        mode: mode,
        modeLabel: modeLabel,
        rootOutputDir: rootOutputDir,
        records: records,
        indexObject: indexObject,
        reporter: reporter,
        exportedAt: exportedAt,
    });
    exporter.writeText(rootOutputDir, "ngm-handoff-export.log", logText);
    reporter.log("导出日志已写入：" + logPath);
    var success = records.filter(function (r) {
        return r.status === "success";
    }).length;
    var failed = records.filter(function (r) {
        return r.status === "failed";
    }).length;
    reporter.finish(success, failed);
    if (failed > 0) {
        showFailureSummary({
            mode: mode,
            modeLabel: modeLabel,
            records: records,
            rootOutputDir: rootOutputDir,
            logPath: logPath,
            success: success,
            failed: failed,
        });
    }
    else {
        showSuccessSummary({
            mode: mode,
            modeLabel: modeLabel,
            groups: groups,
            records: records,
            rootOutputDir: rootOutputDir,
            success: success,
            failed: failed,
        });
    }
    return { rootOutputDir: rootOutputDir, records: records, indexObject: indexObject };
}
function buildExportLogText(options) {
    var lines = [];
    var document = options.document;
    var records = options.records;
    var reporter = options.reporter;
    var indexObject = options.indexObject;
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
        .filter(function (r) {
        return r.status === "success";
    })
        .forEach(function (r) {
        lines.push("- " + r.pageName + " / " + r.artboardName + " -> " + r.outputDir);
    });
    lines.push("");
    lines.push("---- 失败列表 ----");
    records
        .filter(function (r) {
        return r.status === "failed";
    })
        .forEach(function (r) {
        lines.push("- " + r.pageName + " / " + r.artboardName + "，原因：" + (r.reason || "unknown"));
    });
    lines.push("");
    lines.push("---- Warning 列表 ----");
    if (!indexObject.warnings || indexObject.warnings.length === 0) {
        lines.push("（无）");
    }
    else {
        indexObject.warnings.forEach(function (w) {
            lines.push("- " + w);
        });
    }
    lines.push("");
    return lines.join("\n") + "\n";
}
function showSuccessSummary(options) {
    var alert = NSAlert.alloc().init();
    alert.setMessageText(i18n.STRINGS.summary.title);
    var pageNames = (options.groups || []).map(function (g) {
        return (g.page && g.page.name) || "";
    });
    var informative = i18n.STRINGS.summary.mode + "：" + options.modeLabel + "\n" +
        i18n.STRINGS.summary.pages + "：" + (options.groups ? options.groups.length : 0) +
        "（" + pageNames.join("、") + "）\n" +
        i18n.STRINGS.summary.artboards + "：" + options.records.length + "\n" +
        i18n.STRINGS.summary.success + "：" + options.success + "\n" +
        i18n.STRINGS.summary.failed + "：" + options.failed + "\n" +
        i18n.STRINGS.summary.outputRoot + "：" + options.rootOutputDir;
    alert.setInformativeText(informative);
    alert.addButtonWithTitle(i18n.STRINGS.summary.openInFinder);
    alert.addButtonWithTitle(i18n.STRINGS.summary.close);
    var response = alert.runModal();
    var firstButton = typeof NSAlertFirstButtonReturn !== "undefined" ? NSAlertFirstButtonReturn : 1000;
    if (response === firstButton) {
        revealInFinder(options.rootOutputDir);
    }
}
function showFailureSummary(options) {
    var records = options.records || [];
    var failures = records.filter(function (r) {
        return r.status === "failed";
    });
    var failureLines = failures.map(function (r) {
        return ("- " +
            i18n.STRINGS.failure.failedArtboard +
            "：" +
            r.artboardName +
            "\n  " +
            i18n.STRINGS.failure.reason +
            "：" +
            (r.reason || "unknown"));
    });
    var informative = [
        i18n.STRINGS.failure.intro,
        "",
        i18n.STRINGS.summary.mode + "：" + options.modeLabel,
        i18n.STRINGS.failure.succeededCount + "：" + options.success,
        i18n.STRINGS.summary.failed + "：" + options.failed,
        "",
        failureLines.join("\n"),
        "",
        i18n.t("failure.logHint", { path: options.logPath }),
    ];
    var alert = NSAlert.alloc().init();
    alert.setMessageText(i18n.STRINGS.failure.title);
    alert.setInformativeText(informative.join("\n"));
    alert.addButtonWithTitle(i18n.STRINGS.summary.openInFinder);
    alert.addButtonWithTitle(i18n.STRINGS.summary.close);
    var response = alert.runModal();
    var firstButton = typeof NSAlertFirstButtonReturn !== "undefined" ? NSAlertFirstButtonReturn : 1000;
    if (response === firstButton) {
        revealInFinder(options.rootOutputDir);
    }
}
function revealInFinder(path) {
    try {
        NSWorkspace.sharedWorkspace().selectFile_inFileViewerByIndex(String(path), "Finder", 0);
    }
    catch (error) {
        UI.message(i18n.t("summary.openFinderFailed", { path: String(path) }));
    }
}
function showNoArtboardMessage(mode) {
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
function onExportSelectedArtboard() {
    var document = getDocument();
    if (!document) {
        UI.message(i18n.STRINGS.pluginName + " · " + i18n.STRINGS.noDocument);
        return;
    }
    var groups = collectGroupsForMode(document, "selected");
    if (groups.length === 0) {
        showNoArtboardMessage("selected");
        return;
    }
    try {
        runExport(document, "selected", groups);
    }
    catch (error) {
        UI.alert(i18n.STRINGS.exportFailedTitle, error && error.message ? error.message : String(error));
    }
}
function onExportCurrentPage() {
    var document = getDocument();
    if (!document) {
        UI.message(i18n.STRINGS.pluginName + " · " + i18n.STRINGS.noDocument);
        return;
    }
    var groups = collectGroupsForMode(document, "currentPage");
    if (groups.length === 0 || groups[0].artboards.length === 0) {
        showNoArtboardMessage("currentPage");
        return;
    }
    try {
        runExport(document, "currentPage", groups);
    }
    catch (error) {
        UI.alert(i18n.STRINGS.exportFailedTitle, error && error.message ? error.message : String(error));
    }
}
function onExportWholeDocument() {
    var document = getDocument();
    if (!document) {
        UI.message(i18n.STRINGS.pluginName + " · " + i18n.STRINGS.noDocument);
        return;
    }
    var groups = collectGroupsForMode(document, "wholeDocument");
    if (groups.length === 0) {
        showNoArtboardMessage("wholeDocument");
        return;
    }
    try {
        runExport(document, "wholeDocument", groups);
    }
    catch (error) {
        UI.alert(i18n.STRINGS.exportFailedTitle, error && error.message ? error.message : String(error));
    }
}
function onExportCustom() {
    var document = getDocument();
    if (!document) {
        UI.message(i18n.STRINGS.pluginName + " · " + i18n.STRINGS.noDocument);
        return;
    }
    var allGroups = artboardUtils.getDocumentArtboardGroups(document);
    if (allGroups.length === 0) {
        showNoArtboardMessage("wholeDocument");
        return;
    }
    var entries = artboardUtils.flattenGroups(allGroups);
    var selection = scopeDialog.showCustomScopeDialog(entries);
    if (!selection || selection.length === 0) {
        showNoArtboardMessage("custom");
        return;
    }
    var groups = artboardUtils.filterGroupsBySelection(allGroups, selection);
    if (groups.length === 0) {
        showNoArtboardMessage("custom");
        return;
    }
    try {
        runExport(document, "custom", groups);
    }
    catch (error) {
        UI.alert(i18n.STRINGS.exportFailedTitle, error && error.message ? error.message : String(error));
    }
}
function onOpenSettings() {
    try {
        pluginSettings.configureSettings();
    }
    catch (error) {
        UI.alert(i18n.STRINGS.settings.failTitle, error && error.message ? error.message : String(error));
    }
}
module.exports = {
    onExportSelectedArtboard: onExportSelectedArtboard,
    onExportCurrentPage: onExportCurrentPage,
    onExportWholeDocument: onExportWholeDocument,
    onExportCustom: onExportCustom,
    onOpenSettings: onOpenSettings,
};
