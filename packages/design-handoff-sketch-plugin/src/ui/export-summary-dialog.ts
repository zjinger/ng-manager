const i18n = require("../i18n/i18n");

import { revealInFinder } from "../runtime/finder";
import { isFirstButtonResponse, showNativeAlert } from "../runtime/native-alert";
import { showAlert, showMessage } from "../runtime/sketch-ui";
import type { ArtboardExportRecordDto } from "../types/runtime";
import type { ArtboardGroup, ExportMode, ExportSummaryOptions } from "../export/export-types";

function finderFailureMessage(path: string): string {
  return i18n.t("summary.openFinderFailed", { path: path });
}

export function getModeLabel(mode: ExportMode | string): string {
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

export function showSuccessSummary(options: ExportSummaryOptions): void {
  const pageNames = (options.groups || []).map(function (group: ArtboardGroup) {
    return (group.page && group.page.name) || "";
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

  const response = showNativeAlert({
    title: i18n.STRINGS.summary.title,
    message: informative,
    buttons: [i18n.STRINGS.summary.openInFinder, i18n.STRINGS.summary.close],
  });
  if (isFirstButtonResponse(response)) {
    revealInFinder(options.rootOutputDir, finderFailureMessage(options.rootOutputDir));
  }
}

export function showFailureSummary(options: ExportSummaryOptions): void {
  const records = options.records || [];
  const failures = records.filter(function (record: ArtboardExportRecordDto) {
    return record.status === "failed";
  });

  const failureLines = failures.map(function (record: ArtboardExportRecordDto) {
    return (
      "- " +
      i18n.STRINGS.failure.failedArtboard +
      "：" +
      record.artboardName +
      "\n  " +
      i18n.STRINGS.failure.reason +
      "：" +
      (record.reason || "unknown")
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

  const response = showNativeAlert({
    title: i18n.STRINGS.failure.title,
    message: informative.join("\n"),
    buttons: [i18n.STRINGS.summary.openInFinder, i18n.STRINGS.summary.close],
  });
  if (isFirstButtonResponse(response)) {
    revealInFinder(options.rootOutputDir, finderFailureMessage(options.rootOutputDir));
  }
}

export function showNoArtboardMessage(mode: ExportMode): void {
  if (mode === "selected") {
    showAlert(i18n.STRINGS.noArtboardFound, i18n.STRINGS.noArtboardFoundHint);
    return;
  }
  if (mode === "currentPage") {
    showMessage(i18n.STRINGS.pluginName + " · " + i18n.STRINGS.noVisibleArtboards);
    return;
  }
  if (mode === "wholeDocument") {
    showMessage(i18n.STRINGS.pluginName + " · " + i18n.STRINGS.noArtboardsInDocument);
    return;
  }
  if (mode === "custom") {
    showMessage(i18n.STRINGS.pluginName + " · " + i18n.STRINGS.noArtboardsSelected);
  }
}
