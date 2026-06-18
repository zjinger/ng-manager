// @ts-nocheck
// 导出进度报告器。
// 使用轻量 NSWindow + NSProgressIndicator 展示整体进度，同时保留 UI.message 和日志缓冲。

var UI = require("sketch/ui");
var i18n = require("./i18n");

var WINDOW_WIDTH = 460;
var WINDOW_HEIGHT = 126;
var PADDING = 16;

function nowStamp() {
  return new Date().toISOString();
}

function nsRect(x, y, width, height) {
  return NSMakeRect(x, y, width, height);
}

function createProgressWindow(title) {
  try {
    var window = NSWindow.alloc().initWithContentRect_styleMask_backing_defer(
      nsRect(0, 0, WINDOW_WIDTH, WINDOW_HEIGHT),
      NSTitledWindowMask,
      NSBackingStoreBuffered,
      false,
    );
    window.setTitle(title || i18n.STRINGS.pluginName);
    window.center();

    var content = window.contentView();
    var titleLabel = NSTextField.alloc().initWithFrame(nsRect(PADDING, WINDOW_HEIGHT - 42, WINDOW_WIDTH - PADDING * 2, 22));
    titleLabel.setStringValue(i18n.STRINGS.pluginName);
    titleLabel.setBezeled(false);
    titleLabel.setDrawsBackground(false);
    titleLabel.setEditable(false);
    titleLabel.setSelectable(false);
    content.addSubview(titleLabel);

    var detailLabel = NSTextField.alloc().initWithFrame(nsRect(PADDING, WINDOW_HEIGHT - 68, WINDOW_WIDTH - PADDING * 2, 20));
    detailLabel.setStringValue("");
    detailLabel.setBezeled(false);
    detailLabel.setDrawsBackground(false);
    detailLabel.setEditable(false);
    detailLabel.setSelectable(false);
    content.addSubview(detailLabel);

    var bar = NSProgressIndicator.alloc().initWithFrame(nsRect(PADDING, 34, WINDOW_WIDTH - PADDING * 2, 18));
    bar.setIndeterminate(false);
    bar.setMinValue(0);
    bar.setMaxValue(1);
    bar.setDoubleValue(0);
    content.addSubview(bar);

    var countLabel = NSTextField.alloc().initWithFrame(nsRect(PADDING, 10, WINDOW_WIDTH - PADDING * 2, 18));
    countLabel.setStringValue("");
    countLabel.setBezeled(false);
    countLabel.setDrawsBackground(false);
    countLabel.setEditable(false);
    countLabel.setSelectable(false);
    content.addSubview(countLabel);

    window.makeKeyAndOrderFront(null);
    refreshWindow(window);

    return {
      window: window,
      detailLabel: detailLabel,
      countLabel: countLabel,
      bar: bar,
      total: 1,
      closed: false,
    };
  } catch (error) {
    return null;
  }
}

function refreshWindow(window) {
  try {
    window.displayIfNeeded();
    var content = window.contentView();
    if (content && content.displayIfNeeded) {
      content.displayIfNeeded();
    }
  } catch (error) {
    // 进度窗口是辅助能力，刷新失败不影响导出。
  }
}

function updateProgress(state, detail, value, total) {
  if (!state || state.closed) {
    return;
  }
  try {
    if (total && total > 0 && total !== state.total) {
      state.total = total;
      state.bar.setMaxValue(total);
    }
    var current = Math.max(0, Math.min(value || 0, state.total || 1));
    state.bar.setDoubleValue(current);
    state.detailLabel.setStringValue(String(detail || ""));
    state.countLabel.setStringValue(String(Math.round((current / (state.total || 1)) * 100)) + "%");
    refreshWindow(state.window);
  } catch (error) {
    // 进度窗口是辅助能力，更新失败不影响导出。
  }
}

function closeProgressWindow(state) {
  if (!state || state.closed) {
    return;
  }
  try {
    state.closed = true;
    state.window.orderOut(null);
  } catch (error) {
    // 忽略关闭错误。
  }
}

function createReporter(prefix) {
  var lines = [];
  var startTime = new Date();
  var labelPrefix = prefix ? prefix + " · " : i18n.STRINGS.pluginName + " · ";
  var progressWindow = null;
  var totalWork = 1;
  var completedWork = 0;

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
    close: function () {
      closeProgressWindow(progressWindow);
    },

    log: function (line) {
      append(line);
    },

    begin: function () {
      append("导出开始");
      message(i18n.t("collectingArtboards"));
      progressWindow = createProgressWindow(i18n.STRINGS.pluginName);
      updateProgress(progressWindow, i18n.t("collectingArtboards"), 0, totalWork);
    },

    collected: function (count) {
      append("共识别到 " + count + " 个画板");
      messageFromKey("collectedArtboards", { count: count });
      totalWork = Math.max(1, count + 1);
      completedWork = 0;
      updateProgress(progressWindow, i18n.t("collectedArtboards", { count: count }), completedWork, totalWork);
    },

    startArtboard: function (index, total, name) {
      var line = "正在导出第 " + index + " / " + total + " 个画板：" + name;
      append(line);
      messageFromKey("exportingProgress", { index: index, total: total, name: name });
      updateProgress(progressWindow, i18n.t("exportingProgress", { index: index, total: total, name: name }), completedWork, totalWork);
    },

    step: function (key, name) {
      append(i18n.t(key, { name: name }) + "：" + name);
      messageFromKey(key, { name: name });
      updateProgress(progressWindow, i18n.t(key, { name: name }), completedWork, totalWork);
    },

    success: function (artboard, outputDir) {
      var name = (artboard && artboard.name) || "";
      append("成功导出画板：" + name + " -> " + outputDir);
      completedWork += 1;
      updateProgress(progressWindow, "成功导出：" + name, completedWork, totalWork);
    },

    failure: function (artboard, error) {
      var name = (artboard && artboard.name) || "";
      var reason = error && error.message ? error.message : String(error);
      append("失败导出画板：" + name + "，原因：" + reason);
      completedWork += 1;
      updateProgress(progressWindow, "导出失败：" + name, completedWork, totalWork);
    },

    warning: function (text) {
      append("警告：" + text);
    },

    generatingIndex: function () {
      append("正在生成文档索引");
      messageFromKey("generatingDocumentIndex");
      updateProgress(progressWindow, i18n.t("generatingDocumentIndex"), Math.max(completedWork, totalWork - 1), totalWork);
    },

    writingLog: function () {
      append("正在写入导出日志");
      messageFromKey("writingExportLog");
    },

    finish: function (success, failed) {
      append("导出完成：成功 " + success + " 个，失败 " + failed + " 个");
      messageFromKey("exportDone", { success: success, failed: failed });
      updateProgress(progressWindow, i18n.t("exportDone", { success: success, failed: failed }), totalWork, totalWork);
      closeProgressWindow(progressWindow);
    },

    renderLog: function () {
      return lines.join("\n") + "\n";
    },
  };
}

module.exports = {
  createReporter: createReporter,
};

