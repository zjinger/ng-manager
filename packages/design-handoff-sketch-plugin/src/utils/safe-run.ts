const UI = require("sketch/ui");
const i18n = require("../i18n/i18n");
const pluginSettings = require("../sketch/settings");
const debugLogger = require("./debug-logger");
const nativeAlert = require("../runtime/native-alert");

import type { PluginSettingsDto, SafeRunContextLike } from "../export/export-types";

interface SafeRunOptions {
  command?: string;
  commandLabel?: string;
}

interface ErrorAlertOptions {
  commandLabel: string;
  stage: string;
  message: string;
  logPath: string;
}

function getErrorMessage(error: unknown): string {
  return error && typeof error === "object" && "message" in error ? String((error as { message?: unknown }).message) : String(error);
}

function showErrorAlert(options: ErrorAlertOptions): void {
  nativeAlert.showNativeAlert({
    title: i18n.STRINGS.safeRun.errorTitle,
    message: [
      i18n.STRINGS.safeRun.command + "：" + options.commandLabel,
      i18n.STRINGS.safeRun.stage + "：" + options.stage,
      i18n.STRINGS.safeRun.errorMessage + "：" + options.message,
      i18n.STRINGS.safeRun.logPath + "：" + options.logPath,
    ].join("\n"),
    buttons: [i18n.STRINGS.summary.close],
  });
}

export function safeRun(options: SafeRunOptions, handler: (context: SafeRunContextLike) => unknown) {
  const commandLabel = options.commandLabel || options.command || "";
  let settings: PluginSettingsDto;
  try {
    settings = pluginSettings.getSettings();
  } catch (error) {
    settings = { outputRoot: "", exportScreenshot: true };
  }

  const logger = debugLogger.createLogger({
    command: commandLabel,
    outputRoot: settings && settings.outputRoot,
  });
  const context = {
    command: options.command || commandLabel,
    commandLabel: commandLabel,
    settings: settings,
    logger: logger,
    logPath: logger.logPath,
    startedAt: new Date().toISOString(),
    setStage: function (stage: string) {
      logger.setStage(stage);
    },
  };

  UI.message(i18n.t("safeRun.start", { command: commandLabel }));
  logger.info("开始", "菜单命令开始执行", { command: commandLabel, logPath: logger.logPath });

  try {
    const result = handler(context);
    logger.info("完成", "菜单命令执行完成", { command: commandLabel });
    return result;
  } catch (error) {
    const stage = logger.getStage();
    const message = getErrorMessage(error);
    logger.error(stage, "菜单命令执行失败", error, { command: commandLabel });
    showErrorAlert({
      commandLabel: commandLabel,
      stage: stage,
      message: message,
      logPath: logger.logPath,
    });
    return null;
  }
}
