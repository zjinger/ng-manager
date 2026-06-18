// 集中管理插件用户可见中文文案，避免文案散落在各文件中。
// 仅返回中性 JS 数据，由调用方负责 UI.message / UI.alert 的渲染。

var STRINGS = {
  pluginName: "NGM AI Handoff",

  // 通用提示
  noDocument: "未打开 Sketch 文档",
  selectArtboardFirst: "请先选择一个画板，或选择画板内任意图层",
  noArtboardFound: "未找到可导出的画板",
  noArtboardFoundHint: "请选中画板，或选中画板内任意图层后重试",
  noVisibleArtboards: "当前页面没有可见画板",
  noArtboardsInDocument: "当前文档没有可导出的画板",
  noArtboardsSelected: "未勾选任何画板",
  singleArtboardHint: "只识别到 1 个画板，请检查其他对象是否为 Group / Symbol / 已隐藏",

  // 导出进度
  collectingArtboards: "正在收集画板...",
  collectedArtboards: "共识别到 {count} 个画板",
  exportingProgress: "正在导出第 {index} / {total} 个画板：{name}",
  generatingScreenshot: "正在生成截图：{name}",
  generatingHandoffJson: "正在生成 Handoff JSON：{name}",
  generatingPreview: "正在生成预览页面：{name}",
  generatingAiContext: "正在生成 AI 上下文：{name}",
  generatingDocumentIndex: "正在生成文档索引...",
  writingExportLog: "正在写入导出日志...",
  exportDone: "导出完成：成功 {success} 个，失败 {failed} 个",
  outputDirLabel: "输出目录：{dir}",

  // 导出失败
  exportFailedTitle: "导出失败",
  exportFailedReason: "导出失败，请查看导出日志",

  // 导出模式标签
  modeSelected: "导出选中画板",
  modeCurrentPage: "导出当前页面",
  modeWholeDocument: "导出整个文档",
  modeCustom: "自定义导出",

  // 摘要弹窗
  summary: {
    title: "导出完成",
    mode: "模式",
    pages: "页面",
    artboards: "画板",
    success: "成功",
    failed: "失败",
    warnings: "警告",
    outputRoot: "输出目录",
    openInFinder: "在 Finder 中显示",
    close: "关闭",
    openFinderFailed: "无法在 Finder 中打开：{path}",
  },

  // 失败明细弹窗
  failure: {
    title: "导出失败",
    intro: "部分画板导出失败，详情如下：",
    failedArtboard: "失败画板",
    reason: "原因",
    succeededCount: "已成功导出",
    logHint: "请查看日志：{path}",
  },

  // 自定义导出对话框
  custom: {
    title: "NGM AI Handoff · 自定义导出",
    prompt: "请勾选需要导出的画板（共 {count} 个）",
    selectAll: "全选",
    deselectAll: "取消全选",
    confirm: "导出",
    cancel: "取消",
    rowLabel: "{pageName} / {artboardName}",
  },

  // 设置窗口
  settings: {
    title: "NGM AI Handoff 设置",
    exportFolder: "导出目录",
    exportFolderPlaceholder: "（未设置）",
    screenshot: "截图导出",
    enabled: "已启用",
    disabled: "已禁用",
    chooseFolder: "选择目录",
    enable: "启用截图",
    disable: "禁用截图",
    cancel: "关闭",
    folderUpdated: "导出目录已更新",
    screenshotEnabled: "已启用截图导出",
    screenshotDisabled: "已禁用截图导出",
    failTitle: "NGM AI Handoff 设置失败",
    chooseFolderPrompt: "请选择 NGM AI Handoff 导出目录",
    chooseFolderButton: "选择",
  },
};

function format(template, vars) {
  if (template === null || template === undefined) {
    return "";
  }
  if (!vars) {
    return String(template);
  }
  return String(template).replace(/\{(\w+)\}/g, function (match, key) {
    return vars[key] !== undefined && vars[key] !== null ? String(vars[key]) : match;
  });
}

function t(path, vars) {
  // 支持点号路径访问深层文案，例如 t("summary.title")。
  var segments = String(path || "").split(".");
  var current = STRINGS;
  for (var i = 0; i < segments.length; i += 1) {
    if (!current || typeof current !== "object") {
      return path;
    }
    current = current[segments[i]];
  }

  if (current === undefined || current === null) {
    return path;
  }

  return format(current, vars);
}

module.exports = {
  STRINGS: STRINGS,
  format: format,
  t: t,
};
