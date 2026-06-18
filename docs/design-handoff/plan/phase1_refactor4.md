# 任务：优化 Design Handoff Sketch 插件导出进度 UI

## 背景

当前 design-handoff-sketch-plugin 已经有基础进度窗口，但进度粒度较粗，主要按 Artboard 数量推进。

对比 Sketch Measure，用户更需要清晰看到：

- 当前正在处理什么
- 当前处理进度是多少
- 是否卡住
- 是否可以取消
- 失败时在哪里看日志

本任务只优化插件进度 UI，不做 assets 导出增强，不做 preview.html 重构。

## 目标

增强导出进度体验，使导出过程不再像黑盒。

最终进度窗口至少显示：

- 当前导出模式
- 当前阶段
- 当前 Page / Artboard 名称
- 当前处理对象
- 当前数 / 总数
- 百分比进度条
- 取消按钮
- 日志路径
- 完成 / 失败摘要

## 修改范围

主要修改：

- packages/design-handoff-sketch-plugin/src/export-progress.ts
- packages/design-handoff-sketch-plugin/src/exporter.ts
- packages/design-handoff-sketch-plugin/src/main.ts
- packages/design-handoff-sketch-plugin/src/normalize-layer.ts
- packages/design-handoff-sketch-plugin/src/asset-exporter.ts
- packages/design-handoff-sketch-plugin/src/i18n.ts

如果当前源码路径不同，以实际 src 中对应模块为准。

## 任务 1：重构 Progress Reporter

将当前 reporter 从“按 Artboard 简单推进”增强为阶段化进度模型。

新增 ProgressState：

- mode
- phase
- pageName
- artboardName
- currentLabel
- current
- total
- percent
- cancellable
- cancelled
- logPath

新增阶段：

- preparing
- collectingArtboards
- processingLayers
- collectingTexts
- extractingStyles
- extractingTokens
- inferringComponents
- exportingScreenshot
- exportingAssets
- generatingHandoffMap
- generatingPreview
- generatingAiContext
- writingFiles
- generatingIndex
- finished
- failed
- cancelled

## 任务 2：进度窗口视觉优化

将当前进度窗口优化为更接近 Sketch Measure 的浮层样式。

要求：

- 居中显示
- 宽度适中
- 深色背景
- 蓝色进度条
- 大号进度文字
- 显示 current / total
- 显示当前阶段
- 显示当前 Artboard 名称
- 支持取消按钮

不要引入 React / Vue / Angular。

优先使用 macOS 原生 NSWindow / NSPanel / NSProgressIndicator / NSTextField / NSButton。

## 任务 3：增加取消按钮

进度窗口中增加“取消”按钮。

点击后：

- 标记 reporter.cancelled = true
- 当前 Artboard 导出结束后停止后续导出
- 能尽量写出 export-result.json
- 能写入日志
- 弹出“导出已取消”摘要

要求：

- 不强制中断当前正在执行的 Sketch export
- 在 Artboard 间、Layer 遍历间、Asset 导出间检查取消状态

## 任务 4：图层处理进度

当前 Sketch Measure 会显示类似：

图层处理中... 277 / 430

需要在 normalize layer tree 阶段支持图层进度。

要求：

1. 处理前先统计当前 Artboard 图层总数。
2. normalize 时每处理一个 layer 更新 current。
3. 为避免 UI 过度刷新，可以每 20 或 50 个 layer 更新一次窗口。
4. 显示：

图层处理中... current / total

## 任务 5：资源导出进度

资源导出阶段显示：

资源导出中... current / total

要求：

1. 先收集待导出的资源 layer 列表。
2. 导出每个资源后更新进度。
3. 单个资源失败不终止整体导出。
4. warning 写入日志和 assets-map.json。

## 任务 6：减少 UI.message 频率

当前 reporter 会频繁调用 UI.message。

调整为：

- 开始时 UI.message 一次
- 完成时 UI.message 一次
- 失败时 UI.message 一次
- 中间进度只更新进度窗口和日志

## 任务 7：完成摘要

导出完成后显示摘要：

- 导出模式
- Page 数
- Artboard 数
- 成功数量
- 失败数量
- warning 数量
- 是否取消
- 输出目录
- 日志路径

## 任务 8：失败摘要

导出失败时显示：

- 当前阶段
- 当前 Page / Artboard
- 错误信息
- 已成功数量
- 已失败数量
- 日志路径
- 是否有部分文件生成

## 任务 9：诊断菜单支持测试进度窗口

新增或扩展诊断能力：

- 测试进度窗口

用于在不导出真实设计稿的情况下测试：

- 窗口是否显示
- 进度条是否更新
- 取消按钮是否可点击
- 完成状态是否正常

## 不要做

- 不增强 assets 识别类型
- 不重构 preview.html
- 不实现 Sketch Measure 式 inspect panel
- 不接入 Hub V2
- 不引入 WebView UI
- 不引入复杂前端框架
- 不改变 Handoff Package 标准结构
- 不做无关重构

## 验收标准

1. 导出时立即显示进度窗口。
2. 进度窗口显示当前阶段。
3. 进度窗口显示 current / total。
4. 处理图层时显示图层进度。
5. 导出资源时显示资源进度。
6. 支持取消导出。
7. 取消后能写入日志和 export-result.json。
8. 完成后显示中文摘要。
9. 失败后显示中文错误摘要。
10. UI.message 不再频繁刷屏。
11. npm run build 通过。
12. npm run pack:sketch 通过。
13. Mac 上 canary / 诊断 / 扫描 / 导出命令可继续运行。

## 推荐提交信息

feat(design-handoff-sketch-plugin): improve export progress ui