"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var UI = require("sketch/ui");
var i18n = require("./i18n");
function nowStamp() {
    return new Date().toISOString();
}
function createReporter(prefix) {
    var lines = [];
    var startTime = new Date();
    var labelPrefix = prefix ? prefix + " · " : i18n.STRINGS.pluginName + " · ";
    function append(line) {
        lines.push("[" + nowStamp() + "] " + line);
    }
    function message(text) {
        UI.message(labelPrefix + text);
    }
    function messageFromKey(key, vars) {
        message(i18n.t(key, vars));
    }
    function raw(msg) {
        message(String(msg));
    }
    return {
        raw: raw,
        message: message,
        lines: lines,
        startTime: startTime,
        log: function (line) {
            append(line);
        },
        begin: function () {
            append("导出开始");
            message(i18n.t("collectingArtboards"));
        },
        collected: function (count) {
            append("共识别到 " + count + " 个画板");
            messageFromKey("collectedArtboards", { count: count });
        },
        startArtboard: function (index, total, name) {
            var line = "正在导出第 " + index + " / " + total + " 个画板：" + name;
            append(line);
            messageFromKey("exportingProgress", { index: index, total: total, name: name });
        },
        step: function (key, name) {
            append(i18n.t(key, { name: name }) + "：" + name);
            messageFromKey(key, { name: name });
        },
        success: function (artboard, outputDir) {
            var name = (artboard && artboard.name) || "";
            append("成功导出画板：" + name + " -> " + outputDir);
        },
        failure: function (artboard, error) {
            var name = (artboard && artboard.name) || "";
            var reason = error && error.message ? error.message : String(error);
            append("失败导出画板：" + name + "，原因：" + reason);
        },
        warning: function (text) {
            append("警告：" + text);
        },
        generatingIndex: function () {
            append("正在生成文档索引");
            messageFromKey("generatingDocumentIndex");
        },
        writingLog: function () {
            append("正在写入导出日志");
            messageFromKey("writingExportLog");
        },
        finish: function (success, failed) {
            append("导出完成：成功 " + success + " 个，失败 " + failed + " 个");
            messageFromKey("exportDone", { success: success, failed: failed });
        },
        renderLog: function () {
            return lines.join("\n") + "\n";
        },
    };
}
module.exports = {
    createReporter: createReporter,
};
