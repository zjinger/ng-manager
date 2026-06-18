"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var UI = require("sketch/ui");
var i18n = require("./i18n");
var pluginSettings = require("./settings");
var debugLogger = require("./debug-logger");
function getErrorMessage(error) {
    return error && error.message ? String(error.message) : String(error);
}
function showErrorAlert(options) {
    var alert = NSAlert.alloc().init();
    alert.setMessageText(i18n.STRINGS.safeRun.errorTitle);
    alert.setInformativeText([
        i18n.STRINGS.safeRun.command + "：" + options.commandLabel,
        i18n.STRINGS.safeRun.stage + "：" + options.stage,
        i18n.STRINGS.safeRun.errorMessage + "：" + options.message,
        i18n.STRINGS.safeRun.logPath + "：" + options.logPath,
    ].join("\n"));
    alert.addButtonWithTitle(i18n.STRINGS.summary.close);
    alert.runModal();
}
function safeRun(options, handler) {
    var commandLabel = options.commandLabel || options.command || "";
    var settings = null;
    try {
        settings = pluginSettings.getSettings();
    }
    catch (error) {
        settings = { outputRoot: null, exportScreenshot: true };
    }
    var logger = debugLogger.createLogger({
        command: commandLabel,
        outputRoot: settings && settings.outputRoot,
    });
    var context = {
        command: options.command || commandLabel,
        commandLabel: commandLabel,
        settings: settings,
        logger: logger,
        logPath: logger.logPath,
        startedAt: new Date().toISOString(),
        setStage: function (stage) {
            logger.setStage(stage);
        },
    };
    UI.message(i18n.t("safeRun.start", { command: commandLabel }));
    logger.info("开始", "菜单命令开始执行", { command: commandLabel, logPath: logger.logPath });
    try {
        var result = handler(context);
        logger.info("完成", "菜单命令执行完成", { command: commandLabel });
        return result;
    }
    catch (error) {
        var stage = logger.getStage();
        var message = getErrorMessage(error);
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
module.exports = {
    safeRun: safeRun,
};
