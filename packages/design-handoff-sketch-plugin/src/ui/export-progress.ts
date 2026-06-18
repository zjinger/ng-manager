// 导出进度报告器（Phase 1 Refactor 4）。
// 使用轻量 NSWindow + NSProgressIndicator 展示阶段化进度，支持取消与完成/失败摘要。

const UI = require("sketch/ui");
const i18n = require("../i18n/i18n");

const WINDOW_WIDTH = 520;
const WINDOW_HEIGHT = 160;
const PADDING = 16;

type ProgressPhase = keyof typeof PHASES;

interface ProgressState {
  mode: string;
  phase: string;
  pageName: string;
  artboardName: string;
  currentLabel: string;
  current: number;
  total: number;
  percent: number;
  cancellable: boolean;
  cancelled: boolean;
  logPath: string;
  successCount: number;
  failedCount: number;
  warningCount: number;
  startTime: Date;
  reporter: unknown;
}

interface ProgressWindowLike {
  window: any;
  titleLabel: any;
  detailLabel: any;
  infoLabel: any;
  bar: any;
  percentLabel: any;
  cancelButton: any;
  onCancel: null | (() => void);
}

interface ReporterSummary {
  title: string;
  detail: string;
}

const PHASES = {
  preparing: "准备中",
  collectingArtboards: "收集画板",
  processingLayers: "处理图层",
  collectingTexts: "收集文本",
  extractingStyles: "提取样式",
  extractingTokens: "提取 Tokens",
  inferringComponents: "识别组件",
  exportingScreenshot: "导出截图",
  exportingAssets: "导出资源",
  generatingHandoffMap: "生成 Handoff 映射",
  generatingPreview: "生成 Preview",
  generatingAiContext: "生成 AI 上下文",
  writingFiles: "写入文件",
  generatingIndex: "生成文档索引",
  finished: "完成",
  failed: "失败",
  cancelled: "已取消",
} as const;

function nowStamp() {
  return new Date().toISOString();
}

function nsRect(x: number, y: number, width: number, height: number) {
  return NSMakeRect(x, y, width, height);
}

let CancelHandler: any = null;
try {
  CancelHandler = NSObject.extend({
    "initWithReporter:": function(reporter: any) {
      this.reporter = reporter;
      return this;
    },
    "cancel:": function(sender: any) {
      if (this.reporter && this.reporter.state) {
        this.reporter.state.cancelled = true;
      }
      try {
        if (sender && sender.window) sender.window.orderOut(null);
      } catch (e) {
        // ignore
      }
    },
  });
} catch (e) {
  CancelHandler = null;
}

function createProgressWindow(title?: string): ProgressWindowLike | null {
  try {
    const window = NSWindow.alloc().initWithContentRect_styleMask_backing_defer(
      nsRect(0, 0, WINDOW_WIDTH, WINDOW_HEIGHT),
      NSTitledWindowMask,
      NSBackingStoreBuffered,
      false,
    );
    window.setTitle(title || i18n.STRINGS.pluginName);
    window.center();

    const content = window.contentView();

    const titleLabel = NSTextField.alloc().initWithFrame(nsRect(PADDING, WINDOW_HEIGHT - 42, WINDOW_WIDTH - PADDING * 2, 22));
    titleLabel.setStringValue(i18n.STRINGS.pluginName);
    titleLabel.setBezeled(false);
    titleLabel.setDrawsBackground(false);
    titleLabel.setEditable(false);
    titleLabel.setSelectable(false);
    titleLabel.setFont(NSFont.boldSystemFontOfSize(13));
    content.addSubview(titleLabel);

    const detailLabel = NSTextField.alloc().initWithFrame(nsRect(PADDING, WINDOW_HEIGHT - 68, WINDOW_WIDTH - PADDING * 2, 20));
    detailLabel.setStringValue("");
    detailLabel.setBezeled(false);
    detailLabel.setDrawsBackground(false);
    detailLabel.setEditable(false);
    detailLabel.setSelectable(false);
    content.addSubview(detailLabel);

    const infoLabel = NSTextField.alloc().initWithFrame(nsRect(PADDING, WINDOW_HEIGHT - 88, WINDOW_WIDTH - PADDING * 2, 18));
    infoLabel.setStringValue("");
    infoLabel.setBezeled(false);
    infoLabel.setDrawsBackground(false);
    infoLabel.setEditable(false);
    infoLabel.setSelectable(false);
    infoLabel.setTextColor(NSColor.secondaryLabelColor ? NSColor.secondaryLabelColor() : NSColor.grayColor());
    content.addSubview(infoLabel);

    const bar = NSProgressIndicator.alloc().initWithFrame(nsRect(PADDING, 48, WINDOW_WIDTH - PADDING * 2 - 90, 18));
    bar.setIndeterminate(false);
    bar.setMinValue(0);
    bar.setMaxValue(1);
    bar.setDoubleValue(0);
    content.addSubview(bar);

    const percentLabel = NSTextField.alloc().initWithFrame(nsRect(WINDOW_WIDTH - 90, 46, 74, 18));
    percentLabel.setStringValue("0%");
    percentLabel.setBezeled(false);
    percentLabel.setDrawsBackground(false);
    percentLabel.setEditable(false);
    percentLabel.setSelectable(false);
    percentLabel.setAlignment(NSRightTextAlignment);
    content.addSubview(percentLabel);

    const cancelButton = NSButton.alloc().initWithFrame(nsRect(WINDOW_WIDTH - 90 - PADDING, 10, 90, 28));
    cancelButton.setTitle("取消");
    cancelButton.setBezelStyle(NSRoundedBezelStyle);
    cancelButton.setTarget(cancelButton);
    cancelButton.setAction("performClick:");
    content.addSubview(cancelButton);

    window.makeKeyAndOrderFront(null);
    refreshWindow(window);

    return {
      window: window,
      titleLabel: titleLabel,
      detailLabel: detailLabel,
      infoLabel: infoLabel,
      bar: bar,
      percentLabel: percentLabel,
      cancelButton: cancelButton,
      
      onCancel: null,
    };
  } catch (error) {
    return null;
  }
}

function refreshWindow(window: any): void {
  try {
    window.displayIfNeeded();
    const content = window.contentView();
    if (content && content.displayIfNeeded) {
      content.displayIfNeeded();
    }
  } catch (error) {
    // 进度窗口是辅助能力，刷新失败不影响导出。
  }
}

function createProgressState(reporter: unknown): ProgressState {
  return {
    mode: "",
    phase: "preparing",
    pageName: "",
    artboardName: "",
    currentLabel: "",
    current: 0,
    total: 1,
    percent: 0,
    cancellable: true,
    cancelled: false,
    logPath: "",
    successCount: 0,
    failedCount: 0,
    warningCount: 0,
    startTime: new Date(),
    reporter: reporter,
  };
}

function updateProgress(progressWindow: ProgressWindowLike | null, state: ProgressState, detail?: string): void {
  if (!progressWindow || progressWindow.window.closed) {
    return;
  }
  try {
    const total = Math.max(1, state.total || 1);
    const current = Math.max(0, Math.min(state.current || 0, total));
    const percent = Math.round((current / total) * 100);
    state.percent = percent;

    progressWindow.bar.setMaxValue(total);
    progressWindow.bar.setDoubleValue(current);
    progressWindow.percentLabel.setStringValue(String(percent) + "%");
    progressWindow.detailLabel.setStringValue(String(detail || state.currentLabel || ""));

    const infoParts = [];
    if (state.phase && PHASES[state.phase as ProgressPhase]) {
      infoParts.push(PHASES[state.phase as ProgressPhase]);
    }
    if (state.pageName) {
      infoParts.push(state.pageName);
    }
    if (state.artboardName) {
      infoParts.push(state.artboardName);
    }
    if (state.current > 0 || state.total > 1) {
      infoParts.push(state.current + " / " + state.total);
    }
    progressWindow.infoLabel.setStringValue(infoParts.join(" · "));

    refreshWindow(progressWindow.window);
  } catch (error) {
    // 进度窗口是辅助能力，更新失败不影响导出。
  }
}

function closeProgressWindow(progressWindow: ProgressWindowLike | null): void {
  if (!progressWindow || progressWindow.window.closed) {
    return;
  }
  try {
    progressWindow.window.orderOut(null);
    progressWindow.window.closed = true;
  } catch (error) {
    // 忽略关闭错误。
  }
}

export function createReporter(prefix?: string) {
  const lines: string[] = [];
  const labelPrefix = prefix ? prefix + " · " : i18n.STRINGS.pluginName + " · ";
  let progressWindow: ProgressWindowLike | null = null;
  let messageShown = false;
  const state = createProgressState(null);

  function append(line: string): void {
    lines.push("[" + nowStamp() + "] " + line);
  }

  function messageOnce(text: string): void {
    if (!messageShown) {
      UI.message(labelPrefix + text);
      messageShown = true;
    }
  }

  function showSummary(summary: ReporterSummary): void {
    const alert = NSAlert.alloc().init();
    alert.setMessageText(summary.title || i18n.STRINGS.pluginName);
    alert.setInformativeText(summary.detail || "");
    alert.addButtonWithTitle("确定");
    alert.runModal();
  }

  const reporter = {
    state: state,
    lines: lines,

    log: function (line: string) {
      append(line);
    },

    begin: function (mode?: string, logPath?: string) {
      state.mode = mode || "";
      state.logPath = logPath || "";
      state.phase = "preparing";
      state.currentLabel = "准备导出...";
      append("导出开始：mode=" + mode + "，logPath=" + logPath);
      progressWindow = createProgressWindow(i18n.STRINGS.pluginName);
      if (progressWindow && progressWindow.cancelButton && CancelHandler) {
        const handler = CancelHandler.alloc().initWithReporter_(reporter);
        progressWindow.cancelButton.setTarget(handler);
        progressWindow.cancelButton.setAction("cancel:");
      }
      updateProgress(progressWindow, state, state.currentLabel);
      messageOnce(i18n.t("collectingArtboards"));
    },

    setPageName: function (name: string) {
      state.pageName = name || "";
    },

    setPhase: function (phase: string) {
      state.phase = phase || state.phase;
      state.currentLabel = PHASES[state.phase as ProgressPhase] || state.phase;
      append("阶段切换：" + state.phase);
      updateProgress(progressWindow, state, state.currentLabel);
    },

    setProgress: function (current: number, total: number, label?: string) {
      state.current = current || 0;
      state.total = total || 1;
      state.currentLabel = label || state.currentLabel;
      append("进度更新：" + current + " / " + total + " — " + label);
      updateProgress(progressWindow, state, state.currentLabel);
    },

    processLayers: function (current: number, total: number) {
      state.phase = "processingLayers";
      state.current = current;
      state.total = total;
      state.currentLabel = "处理图层...";
      append("处理图层：" + current + " / " + total);
      updateProgress(progressWindow, state, state.currentLabel);
    },

    exportAssets: function (current: number, total: number) {
      state.phase = "exportingAssets";
      state.current = current;
      state.total = total;
      state.currentLabel = "导出资源...";
      append("导出资源：" + current + " / " + total);
      updateProgress(progressWindow, state, state.currentLabel);
    },

    isCancelled: function () {
      return state.cancelled;
    },

    checkCancelled: function () {
      if (state.cancelled) {
        append("导出已取消");
        throw new Error("cancelled");
      }
    },

    collected: function (count: number) {
      append("共识别到 " + count + " 个画板");
      state.phase = "collectedArtboards";
      state.total = Math.max(1, count + 1);
      state.current = 0;
      state.currentLabel = "已收集 " + count + " 个画板";
      updateProgress(progressWindow, state, state.currentLabel);
    },

    startArtboard: function (index: number, total: number, name?: string) {
      state.artboardName = name || "";
      state.currentLabel = i18n.t("exportingProgress", { index: index, total: total, name: name });
      append("开始导出画板：" + index + " / " + total + " " + name);
      updateProgress(progressWindow, state, state.currentLabel);
    },

    step: function (key: string, name?: string) {
      const text = i18n.t(key, { name: name });
      append(text + "：" + name);
      state.currentLabel = text;
      updateProgress(progressWindow, state, state.currentLabel);
    },

    success: function (artboard: SketchLayerLike | undefined | null, outputDir: string) {
      const name = (artboard && artboard.name) || "";
      append("成功导出画板：" + name + " -> " + outputDir);
      state.successCount += 1;
      state.current += 1;
      updateProgress(progressWindow, state, "成功导出：" + name);
    },

    failure: function (artboard: SketchLayerLike | undefined | null, error: unknown) {
      const name = (artboard && artboard.name) || "";
      const reason = error && typeof error === "object" && "message" in error ? String((error as { message?: unknown }).message) : String(error);
      append("失败导出画板：" + name + "，原因：" + reason);
      state.failedCount += 1;
      state.current += 1;
      updateProgress(progressWindow, state, "导出失败：" + name);
    },

    warning: function (text: string) {
      append("警告：" + text);
      state.warningCount += 1;
    },

    generatingIndex: function () {
      state.phase = "generatingIndex";
      append("正在生成文档索引");
      state.currentLabel = i18n.t("generatingDocumentIndex");
      updateProgress(progressWindow, state, state.currentLabel);
    },

    writingLog: function () {
      append("正在写入导出日志");
    },

    finish: function () {
      state.phase = "finished";
      const duration = Math.round((new Date().getTime() - state.startTime.getTime()) / 1000);
      append("导出完成：成功 " + state.successCount + " 个，失败 " + state.failedCount + " 个，警告 " + state.warningCount + " 个，耗时 " + duration + " 秒");
      state.currentLabel = "导出完成";
      state.current = state.total;
      updateProgress(progressWindow, state, state.currentLabel);
      closeProgressWindow(progressWindow);
      UI.message(i18n.t("exportDone", { success: state.successCount, failed: state.failedCount }));
      return {
        title: "导出完成",
        detail:
          "模式：" + state.mode + "\n" +
          "成功：" + state.successCount + " 个画板\n" +
          "失败：" + state.failedCount + " 个画板\n" +
          "警告：" + state.warningCount + " 条\n" +
          "耗时：" + duration + " 秒\n" +
          (state.logPath ? "日志：" + state.logPath : ""),
      };
    },

    fail: function (error: unknown) {
      state.phase = "failed";
      const reason = error && typeof error === "object" && "message" in error ? String((error as { message?: unknown }).message) : String(error);
      append("导出失败：" + reason);
      state.currentLabel = "导出失败";
      updateProgress(progressWindow, state, state.currentLabel);
      closeProgressWindow(progressWindow);
      UI.message("导出失败：" + reason);
      return {
        title: "导出失败",
        detail:
          "阶段：" + state.phase + "\n" +
          "Page：" + state.pageName + "\n" +
          "画板：" + state.artboardName + "\n" +
          "错误：" + reason + "\n" +
          "已成功：" + state.successCount + " 个\n" +
          "已失败：" + state.failedCount + " 个\n" +
          (state.logPath ? "日志：" + state.logPath : ""),
      };
    },

    cancel: function () {
      state.phase = "cancelled";
      append("导出已取消");
      state.currentLabel = "导出已取消";
      updateProgress(progressWindow, state, state.currentLabel);
      closeProgressWindow(progressWindow);
      return {
        title: "导出已取消",
        detail:
          "成功：" + state.successCount + " 个\n" +
          "失败：" + state.failedCount + " 个\n" +
          "警告：" + state.warningCount + " 条\n" +
          (state.logPath ? "日志：" + state.logPath : ""),
      };
    },

    renderLog: function () {
      return lines.join("\n") + "\n";
    },
  };

  return reporter;
}

export { PHASES };
