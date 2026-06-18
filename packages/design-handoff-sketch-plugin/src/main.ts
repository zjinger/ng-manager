const sketch = require("sketch");
const pluginSettings = require("./sketch/settings");
const i18n = require("./i18n/i18n");
const artboardUtils = require("./sketch/artboard-utils");
const scopeDialog = require("./ui/export-scope-dialog");
const safeRunModule = require("./utils/safe-run");
const diagnostics = require("./utils/diagnostics");
const scanPage = require("./utils/scan-page");

import { VERSION as PLUGIN_VERSION } from "./generated/version";
import { collectGroupsForMode, runExport } from "./export/run-export";
import { showNoArtboardMessage } from "./ui/export-summary-dialog";
import type { ArtboardGroup, ExportMode, FlatArtboardEntry, SafeRunContextLike } from "./export/export-types";

function getDocument(): SketchDocumentLike | undefined {
  return sketch.getSelectedDocument();
}

function runModeExport(mode: ExportMode, context: SafeRunContextLike): unknown {
  context.logger.step("获取当前文档", "准备获取当前文档");
  const document = getDocument();
  if (!document) {
    throw new Error(i18n.STRINGS.noDocument);
  }
  const groups = collectGroupsForMode(document, mode);
  if (groups.length === 0 || (mode === "currentPage" && groups[0].artboards.length === 0)) {
    showNoArtboardMessage(mode);
    return null;
  }
  return runExport(document, mode, groups, context, PLUGIN_VERSION);
}

function runCustomExport(context: SafeRunContextLike): unknown {
  context.logger.step("获取当前文档", "准备获取当前文档");
  const document = getDocument();
  if (!document) {
    throw new Error(i18n.STRINGS.noDocument);
  }
  const allGroups: ArtboardGroup[] = artboardUtils.getDocumentArtboardGroups(document);
  if (allGroups.length === 0) {
    showNoArtboardMessage("wholeDocument");
    return null;
  }
  const entries: FlatArtboardEntry[] = artboardUtils.flattenGroups(allGroups);
  const selection = scopeDialog.showCustomScopeDialog(entries);
  if (!selection || selection.length === 0) {
    showNoArtboardMessage("custom");
    return null;
  }
  const groups: ArtboardGroup[] = artboardUtils.filterGroupsBySelection(allGroups, selection);
  if (groups.length === 0) {
    showNoArtboardMessage("custom");
    return null;
  }
  return runExport(document, "custom", groups, context, PLUGIN_VERSION);
}

function onExportSelectedArtboard() {
  return safeRunModule.safeRun(
    { command: "export-selected-artboard", commandLabel: i18n.STRINGS.modeSelected },
    function (context: SafeRunContextLike) {
      return runModeExport("selected", context);
    },
  );
}

function onExportCurrentPage() {
  return safeRunModule.safeRun(
    { command: "export-current-page", commandLabel: i18n.STRINGS.modeCurrentPage },
    function (context: SafeRunContextLike) {
      return runModeExport("currentPage", context);
    },
  );
}

function onExportWholeDocument() {
  return safeRunModule.safeRun(
    { command: "export-whole-document", commandLabel: i18n.STRINGS.modeWholeDocument },
    function (context: SafeRunContextLike) {
      return runModeExport("wholeDocument", context);
    },
  );
}

function onExportCustom() {
  return safeRunModule.safeRun(
    { command: "export-custom", commandLabel: i18n.STRINGS.modeCustom },
    function (context: SafeRunContextLike) {
      return runCustomExport(context);
    },
  );
}

function onOpenSettings() {
  return safeRunModule.safeRun({ command: "open-settings", commandLabel: i18n.STRINGS.settings.title }, function () {
    pluginSettings.configureSettings();
  });
}

function onDiagnosePluginEnvironment() {
  return safeRunModule.safeRun(
    { command: "diagnose-plugin-environment", commandLabel: i18n.STRINGS.diagnostics.menu },
    function (context: SafeRunContextLike) {
      return diagnostics.runDiagnostics(context, { pluginVersion: PLUGIN_VERSION });
    },
  );
}

function onScanCurrentPage() {
  return safeRunModule.safeRun(
    { command: "scan-current-page", commandLabel: i18n.STRINGS.scan.menu },
    function (context: SafeRunContextLike) {
      return scanPage.runScanCurrentPage(context);
    },
  );
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
