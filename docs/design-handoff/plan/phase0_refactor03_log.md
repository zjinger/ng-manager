# 任务：为 Design Handoff Sketch 插件增加调试与可观测性能力

## 背景

当前 Sketch 插件在 Mac 上运行时，如果导出没有反应，无法判断原因。

可能原因包括：

- 菜单命令没有触发
- 没有选中 Artboard
- 当前页面没有识别到 Artboard
- 输出目录不可写
- screenshot 导出失败
- JSON 生成失败
- 文件写入失败
- 插件内部异常被 Sketch 吞掉
- 导出成功但用户不知道输出目录

需要为插件增加调试、日志、错误提示和诊断能力，避免插件变成黑盒。

## 目标

让插件具备以下能力：

1. 每个菜单命令都有开始提示。
2. 每个菜单命令都有统一异常捕获。
3. 导出过程写入日志文件。
4. 导出过程生成 export-result.json。
5. 导出失败时弹出明确错误。
6. 导出成功时显示输出目录。
7. 新增“诊断插件环境”菜单。
8. 新增“扫描当前页面”菜单。
9. 所有用户可见信息使用中文。

## 修改范围

主要修改：

- packages/design-handoff-sketch-plugin/src/
- packages/design-handoff-sketch-plugin/sketchplugin/
- 或当前尚未拆包时：
  - packages/design-handoff/sketchplugin/ngm-ai-handoff.sketchplugin/Contents/Sketch/

可新增：

- debug-logger.js
- safe-run.js
- diagnostics.js
- scan-page.js
- export-result-writer.js

## 任务 1：新增统一 safeRun

所有菜单 handler 必须通过 safeRun 执行。

safeRun 负责：

- 显示开始提示
- 捕获异常
- 写入错误日志
- 弹出中文错误提示
- 显示日志路径

错误提示必须包含：

- 当前命令
- 错误信息
- 日志路径

## 任务 2：新增 debug-logger

新增日志模块。

日志至少支持：

- info
- warn
- error
- step

日志写入位置：

- 优先写入 outputRoot/logs/ngm-ai-handoff.log
- 如果 outputRoot 不可用，写入用户桌面 ngm-ai-handoff/logs/

每条日志包含：

- 时间
- 等级
- 命令
- 阶段
- 消息
- 附加数据
- error stack

## 任务 3：导出过程增加阶段日志

导出过程每个关键步骤都要写日志：

- 开始导出
- 读取设置
- 获取当前文档
- 获取当前 Page
- 收集 Artboard
- 创建输出目录
- normalize layer tree
- collect texts
- extract styles
- extract tokens
- infer components
- export screenshot
- export assets
- build handoff map
- generate preview html
- generate design context
- write json files
- write html files
- 导出完成
- 导出失败

## 任务 4：导出过程生成 export-result.json

每次导出后生成：

- export-result.json

内容包括：

- mode
- startedAt
- finishedAt
- durationMs
- documentName
- pageName
- outputRoot
- totalArtboards
- successCount
- failedCount
- items
- warnings
- errors

如果导出失败，也要尽量写出 export-result.json。

## 任务 5：新增“诊断插件环境”菜单

manifest 中新增菜单：

- 诊断插件环境

功能：

- 不导出任何文件
- 检查当前 Sketch 环境
- 显示当前文档状态
- 显示当前 Page 状态
- 显示选中图层信息
- 显示当前 Page Artboard 数量
- 检查输出目录是否可写
- 写入 diagnostics-result.json
- 弹窗显示摘要

诊断结果包含：

- pluginVersion
- sketchVersion
- documentName
- documentPath
- selectedPageName
- selectedLayerCount
- selectedLayers
- visibleArtboardCount
- visibleArtboards
- outputRoot
- outputRootWritable
- logPath

## 任务 6：新增“扫描当前页面”菜单

manifest 中新增菜单：

- 扫描当前页面

功能：

- 不导出 Handoff Package
- 只扫描当前 Page 的 Artboard
- 显示识别到的 Artboard 数量
- 写入 scan-result.json

用于判断：

- 当前页面是否真的有 Artboard
- Artboard 是否 hidden
- Artboard 名称是什么
- 当前插件是否能识别这些 Artboard

## 任务 7：导出成功后显示摘要

导出完成后弹窗显示：

- 导出模式
- 成功数量
- 失败数量
- warning 数量
- 输出目录
- 日志路径

如果 Sketch API 支持，导出完成后打开 Finder 到输出目录。

## 任务 8：导出失败时显示明确错误

不能静默失败。

失败提示至少包含：

- 命令名称
- 当前阶段
- 错误信息
- 日志路径
- 是否已生成部分文件

## 任务 9：中文化调试信息

所有用户可见内容使用中文：

- 菜单
- UI.message
- UI.alert
- 诊断摘要
- 错误提示
- 导出摘要

## 不要做

- 不接入 Hub V2
- 不实现右侧 Handoff 面板
- 不增强 .sketch parser
- 不解析旧 Sketch Measure HTML
- 不新增复杂导出能力
- 不引入大型 UI 框架
- 不做无关重构

## 验收标准

1. 每个菜单命令点击后都有可见提示。
2. 插件异常不会静默失败。
3. 导出过程生成 ngm-ai-handoff.log。
4. 导出过程生成 export-result.json。
5. 新增“诊断插件环境”菜单。
6. 新增“扫描当前页面”菜单。
7. 诊断结果能显示当前文档、当前 Page、选中图层、Artboard 数量。
8. 扫描当前页面能显示识别到的 Artboard 数量。
9. 导出成功后显示输出目录和日志路径。
10. 导出失败后显示明确错误和日志路径。
11. npm run build 通过。
12. npm run pack:sketch 通过。

## 推荐提交信息

feat(design-handoff): add sketch plugin diagnostics and debug logging