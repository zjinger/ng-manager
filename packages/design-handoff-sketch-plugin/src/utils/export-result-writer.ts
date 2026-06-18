import type { ArtboardExportRecordDto, ExportItemStatus, ExportResultDto, ExportResultWarningDto, ExportResultErrorDto } from "../types/runtime";

import * as debugLogger from "./debug-logger";

function countByStatus(items: ArtboardExportRecordDto[] | undefined, status: ExportItemStatus): number {
  return (items || []).filter(function (item: ArtboardExportRecordDto) {
    return item.status === status;
  }).length;
}

export function collectWarnings(items: ArtboardExportRecordDto[] | undefined): ExportResultWarningDto[] {
  let warnings: ExportResultWarningDto[] = [];
  (items || []).forEach(function (item) {
    (item.warnings || []).forEach(function (warning: string) {
      warnings.push({
        artboardName: item.artboardName || "",
        message: warning,
      });
    });
  });
  return warnings;
}

export function collectErrors(items: ArtboardExportRecordDto[] | undefined, extraErrors: ExportResultErrorDto[] | undefined): ExportResultErrorDto[] {
  let errors: ExportResultErrorDto[] = [];
  (items || [])
    .filter(function (item: ArtboardExportRecordDto) {
      return item.status === "failed";
    })
    .forEach(function (item: ArtboardExportRecordDto) {
      errors.push({
        artboardName: item.artboardName || "",
        message: item.reason || "unknown",
      });
    });
  (extraErrors || []).forEach(function (error: ExportResultErrorDto) {
    errors.push(error);
  });
  return errors;
}

export function buildExportResult(input: {
  mode?: string;
  startedAt?: string;
  finishedAt?: string;
  documentName?: string;
  pageName?: string;
  outputRoot?: string;
  items?: ArtboardExportRecordDto[];
  warnings?: ExportResultWarningDto[];
  errors?: ExportResultErrorDto[];
  logPath?: string;
}): ExportResultDto {
  let started = input.startedAt ? new Date(input.startedAt).getTime() : Date.now();
  let finishedAt = input.finishedAt || new Date().toISOString();
  let finished = new Date(finishedAt).getTime();
  let items: ArtboardExportRecordDto[] = input.items || [];
  let warnings: ExportResultWarningDto[] = input.warnings || collectWarnings(items);
  let errors: ExportResultErrorDto[] = input.errors || collectErrors(items, []);

  return {
    mode: input.mode,
    startedAt: input.startedAt,
    finishedAt: finishedAt,
    durationMs: Math.max(0, finished - started),
    documentName: input.documentName || "",
    pageName: input.pageName || "",
    outputRoot: input.outputRoot || "",
    totalArtboards: items.length,
    successCount: countByStatus(items, "success"),
    failedCount: countByStatus(items, "failed"),
    items: items,
    warnings: warnings,
    errors: errors,
    logPath: input.logPath || "",
  };
}

export function writeExportResult(outputRoot: string, result: ExportResultDto): string | null {
  if (!outputRoot) {
    return null;
  }
  debugLogger.writeJsonFile(outputRoot, "export-result.json", result);
  return debugLogger.joinPath(outputRoot, "export-result.json");
}
