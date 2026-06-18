// @ts-nocheck
var debugLogger = require("./debug-logger");

function countByStatus(items, status) {
  return (items || []).filter(function (item) {
    return item.status === status;
  }).length;
}

function collectWarnings(items) {
  var warnings = [];
  (items || []).forEach(function (item) {
    (item.warnings || []).forEach(function (warning) {
      warnings.push({
        artboardName: item.artboardName || "",
        message: warning,
      });
    });
  });
  return warnings;
}

function collectErrors(items, extraErrors) {
  var errors = [];
  (items || [])
    .filter(function (item) {
      return item.status === "failed";
    })
    .forEach(function (item) {
      errors.push({
        artboardName: item.artboardName || "",
        message: item.reason || "unknown",
      });
    });
  (extraErrors || []).forEach(function (error) {
    errors.push(error);
  });
  return errors;
}

function buildExportResult(input) {
  var started = input.startedAt ? new Date(input.startedAt).getTime() : Date.now();
  var finishedAt = input.finishedAt || new Date().toISOString();
  var finished = new Date(finishedAt).getTime();
  var items = input.items || [];
  var warnings = input.warnings || collectWarnings(items);
  var errors = input.errors || collectErrors(items, []);

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

function writeExportResult(outputRoot, result) {
  if (!outputRoot) {
    return null;
  }
  debugLogger.writeJsonFile(outputRoot, "export-result.json", result);
  return debugLogger.joinPath(outputRoot, "export-result.json");
}

module.exports = {
  buildExportResult: buildExportResult,
  collectErrors: collectErrors,
  collectWarnings: collectWarnings,
  writeExportResult: writeExportResult,
};
