# 任务：收敛 Sketch 插件产物结构，移除 Contents/Sketch 下的业务散件 JS

## 背景

当前 design-handoff-sketch-plugin 构建后，ngm-ai-handoff.sketchplugin/Contents/Sketch 下同时存在：

- main-bundle.js
- canary.js
- command-xxx.js
- 大量业务散件 JS

例如：

- exporter.js
- settings.js
- normalize-layer.js
- preview-renderer.js
- asset-exporter.js
- component-infer.js
- debug-logger.js
- diagnostics.js
- document-index-generator.js
- export-progress.js
- export-result-writer.js
- export-scope-dialog.js
- handoff-map-generator.js
- i18n.js
- safe-run.js
- scan-page.js

这导致插件产物结构不清晰，也不像成熟 Sketch 插件。

对比 Sketch Measure，其插件产物结构更接近：

- Contents/Sketch/manifest.json
- Contents/Sketch/mark_bundle.js
- Contents/Resources/template.html
- Contents/Resources/panel/
- Contents/Resources/i18n/

本任务只收敛插件产物结构，不做导出功能增强。

## 目标

构建后，ngm-ai-handoff.sketchplugin 的产物结构应为：

- Contents/Sketch/manifest.json
- Contents/Sketch/main-bundle.js
- Contents/Sketch/canary.js
- Contents/Sketch/command-xxx.js
- Contents/Resources/

Contents/Sketch 下不再保留业务散件 JS。

## 修改范围

主要修改：

- packages/design-handoff-sketch-plugin/scripts/build-plugin.ts
- packages/design-handoff-sketch-plugin/scripts/pack-sketch-plugin.ts
- packages/design-handoff-sketch-plugin/sketchplugin/ngm-ai-handoff.sketchplugin/Contents/

## 任务 1：停止复制业务散件 JS

当前 build-plugin.ts 会把 lib/src 下所有 .js 文件复制到 Contents/Sketch。

需要调整为：

- 仍然读取 lib/src 下的 .js 文件来生成 main-bundle.js
- 但不要把这些 .js 文件逐个复制到 Contents/Sketch

构建后 Contents/Sketch 下不应出现：

- exporter.js
- settings.js
- normalize-layer.js
- preview-renderer.js
- asset-exporter.js
- component-infer.js
- debug-logger.js
- diagnostics.js
- document-index-generator.js
- export-progress.js
- export-result-writer.js
- export-scope-dialog.js
- handoff-map-generator.js
- i18n.js
- safe-run.js
- scan-page.js

## 任务 2：保留 main-bundle.js

继续生成：

- Contents/Sketch/main-bundle.js

main-bundle.js 内部继续包含当前所有业务模块和 handler。

## 任务 3：暂时保留 command wrapper

第一阶段保留：

- command-export-selected-artboard.js
- command-export-current-page.js
- command-export-whole-document.js
- command-export-custom.js
- command-open-settings.js
- command-diagnose-plugin-environment.js
- command-scan-current-page.js

这些文件只作为 Sketch command 薄入口，不包含业务逻辑。

## 任务 4：保留 canary.js

保留：

- Contents/Sketch/canary.js

用途：

- 验证 Sketch 是否能加载插件命令
- 方便 Mac 端调试

后续插件稳定后再考虑移除。

## 任务 5：调整 Resources 输出位置

当前 resources 输出到了：

- Contents/Sketch/resources/

需要改为：

- Contents/Resources/

构建后应存在：

- Contents/Resources/templates/
- Contents/Resources/panel/
- Contents/Resources/styles/
- Contents/Resources/i18n/

如果当前代码中引用了 resources 路径，需要同步修正。

## 任务 6：清理旧产物

每次 build 前需要清理：

- Contents/Sketch 下除 manifest.json 外的旧文件
- Contents/Resources 下旧资源

再生成：

- main-bundle.js
- canary.js
- command-xxx.js
- Resources

## 任务 7：确认 manifest

manifest 中 command script 应只指向：

- canary.js
- command-xxx.js

不要指向业务散件 JS。

## 不要做

- 不改变菜单名称
- 不改变 handler 名称
- 不改变 Handoff Package 结构
- 不增强 assets 导出
- 不增强 preview.html
- 不接入 Hub V2
- 不重写插件业务逻辑
- 不引入 UI 框架

## 验收标准

1. npm run build 通过。
2. npm run pack:sketch 通过。
3. Contents/Sketch 下不再有业务散件 JS。
4. Contents/Sketch 下保留 manifest.json。
5. Contents/Sketch 下保留 main-bundle.js。
6. Contents/Sketch 下保留 command-xxx.js。
7. Contents/Sketch 下保留 canary.js。
8. Contents/Resources 存在。
9. resources 不再输出到 Contents/Sketch/resources。
10. manifest 中所有 script 都能找到。
11. 插件菜单不丢失。
12. canary 命令可运行。
13. 原有导出命令仍可运行。

## 推荐提交信息

refactor(design-handoff-sketch-plugin): clean plugin runtime output structure