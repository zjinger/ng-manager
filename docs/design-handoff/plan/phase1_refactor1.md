# 任务：增强 Sketch 插件资源导出能力，为 Pure HTML Preview 做准备

## 背景

当前 design-handoff-sketch-plugin 已经拆分为独立包，并能导出 Handoff Package。

但当前 assets 导出能力不足，主要只识别 Slice / Image / Bitmap，导致图标、矢量图层、Symbol 图标等资源没有完整进入 assets-map.json，进一步影响 preview.html 的 HTML 还原效果。

## 目标

升级 Sketch 插件的资源导出能力，先解决图标和图片资源导出不完整的问题。

本任务只做 Asset Export v2，不做完整 Sketch Measure 式 inspect UI。

## 修改范围

主要修改：

- packages/design-handoff-sketch-plugin/src/
- packages/design-handoff-sketch-plugin/sketchplugin/ngm-ai-handoff.sketchplugin/Contents/Sketch/asset-exporter.js
- packages/design-handoff-sketch-plugin/sketchplugin/ngm-ai-handoff.sketchplugin/Contents/Sketch/preview-renderer.js

如果源码已由 src 构建生成，则优先修改 src 中对应模块，不要直接长期维护构建产物。

## 当前问题

当前 asset-exporter 只识别：

- Slice
- Image
- Bitmap

需要扩展到：

- SymbolInstance
- ShapePath
- Group icon
- Exportable layer
- icon / logo 命名规则
- 小尺寸矢量图标
- Library Symbol 图标

## 任务 1：扩展资源识别

新增资源分类：

- bitmap
- image
- slice
- icon
- vector
- symbol
- logo
- misc

资源识别规则：

1. layer.type 是 Slice → slice
2. layer.type 是 Image / Bitmap → bitmap
3. layer 有 exportFormats / exportable 设置 → exportable
4. layer.type 是 SymbolInstance → symbol
5. layer.name 命中 icon / 图标 / svg / logo → icon
6. layer 是 Group，尺寸较小，内部主要由 ShapePath 组成 → icon
7. layer 是 ShapePath，尺寸较小 → vector/icon

## 任务 2：增强导出策略

导出格式策略：

- bitmap / image / slice 默认 png
- icon / vector 优先 svg
- svg 导出失败时 fallback png
- symbol 优先 png，后续再考虑 svg
- complex group fallback png

## 任务 3：修复导出文件名判断

不要假设 Sketch 导出后文件名一定是 baseName.png。

改为：

1. 导出前扫描目标目录
2. 执行 sketch.export
3. 导出后扫描目标目录
4. 找新增文件
5. 将新增文件重命名为稳定文件名
6. 写入 assets-map.json

## 任务 4：增强 assets-map.json

每个 asset 至少包含：

- id
- name
- layerId
- handoffId
- artboardId
- type
- format
- path
- width
- height
- frame
- absoluteFrame
- sourceLayerType
- exportStatus
- warnings

## 任务 5：让 preview.html 使用新 assets

preview-renderer 需要优先用 assets-map 中的资源渲染：

- bitmap → img
- image → img
- slice → img
- icon → img/svg
- symbol → img
- vector → img/svg

如果某个资源导出失败，要保留 warning，不要中断整个 Artboard 导出。

## 不要做

- 不实现完整 Sketch Measure inspect UI
- 不做距离测量
- 不做 Hub V2 接入
- 不增强 .sketch parser
- 不解析旧 Sketch Measure HTML
- 不重写整个插件
- 不破坏现有 Handoff Package 结构

## 验收标准

1. assets-map.json 中不再只包含 bitmap / slice。
2. 图标类图层可以进入 assets-map.json。
3. Symbol 图标可以进入 assets-map.json。
4. 导出文件名不再依赖 baseName.png 假设。
5. preview.html 能引用新导出的图标 / 图片资源。
6. 导出失败的资源会写入 warnings。
7. 单个资源失败不会导致整个 Artboard 导出失败。
8. npm run build 通过。
9. npm run pack:sketch 通过。