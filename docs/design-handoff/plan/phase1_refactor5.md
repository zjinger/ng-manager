# 任务：逐步清理 design-handoff-sketch-plugin 源码中的 var，推进 TypeScript 化

## 背景

当前 design-handoff-sketch-plugin 已拆分为独立包，但源码中仍保留大量 JS 风格代码，例如 var、require、@ts-nocheck。

需要逐步提升源码可维护性。

注意：不要处理构建产物目录，只处理 src 源码。

## 目标

逐步将 packages/design-handoff-sketch-plugin/src 中的源码从 JS 风格收敛为 TypeScript 风格：

- var 改为 const / let
- 优先移除纯逻辑模块中的 @ts-nocheck
- 补充必要类型
- 不破坏 Sketch Runtime 兼容
- 不修改构建产物

## 修改范围

只处理：

- packages/design-handoff-sketch-plugin/src/**/*.ts

不要处理：

- packages/design-handoff-sketch-plugin/lib/
- packages/design-handoff-sketch-plugin/sketchplugin/
- packages/design-handoff-sketch-plugin/sketchplugin/ngm-ai-handoff.sketchplugin/Contents/Sketch/*.js

## 处理原则

1. 不会重新赋值的变量改为 const。
2. 会重新赋值的变量改为 let。
3. 不做全局机械替换。
4. 不改变业务逻辑。
5. 不强制把 require 改成 import。
6. 不一次性移除所有 @ts-nocheck。
7. 先处理纯逻辑模块，再处理 Sketch Runtime 模块。
8. 构建产物中出现 var 可以接受。

## 第一批处理模块

优先处理纯逻辑模块：

- src/i18n.ts
- src/document-index-generator.ts
- src/component-infer.ts
- src/handoff-map-generator.ts
- src/design-context-generator.ts
- src/prompt-generator.ts
- src/preview-renderer.ts
- src/export-result-writer.ts

要求：

- var 改为 const / let
- 尽量移除 @ts-nocheck
- 补充基础类型
- 保持现有导出不变

## 第二批处理模块

处理半运行时模块：

- src/normalize-layer.ts
- src/style-extractor.ts
- src/artboard-utils.ts
- src/scan-page.ts
- src/diagnostics.ts

要求：

- var 改为 const / let
- 保留必要 any
- 不破坏 Sketch layer / document 访问逻辑

## 第三批暂缓处理模块

暂缓处理：

- src/main.ts
- src/exporter.ts
- src/settings.ts
- src/asset-exporter.ts
- src/export-progress.ts
- src/export-scope-dialog.ts
- src/safe-run.ts
- src/debug-logger.ts

这些模块依赖 Sketch Runtime / Cocoa API，后续单独处理。

## 类型声明

新增最小类型声明：

- src/types/sketch-runtime.d.ts
- src/types/cocoa.d.ts

只声明当前项目实际用到的最小 API，不追求完整。

## ESLint 建议

如果当前包已有 ESLint，可加规则：

- no-var: error
- prefer-const: warn

如果没有 ESLint，本任务不要强行引入复杂 ESLint 配置，可先人工清理第一批模块。

## 不要做

- 不处理 lib 目录
- 不处理 sketchplugin 目录
- 不修改构建产物
- 不重构业务流程
- 不改变 Handoff Package 结构
- 不改变 Sketch 插件菜单
- 不强制 ESM 化
- 不引入复杂依赖

## 验收标准

1. 第一批纯逻辑模块不再使用 var。
2. 第一批模块尽量移除 @ts-nocheck。
3. TypeScript 编译通过。
4. npm run build 通过。
5. npm run pack:sketch 通过。
6. 构建后的插件菜单不丢失。
7. 构建产物中保留 var 不作为问题。
8. 没有无关功能变更。

## 推荐提交信息

refactor(design-handoff-sketch-plugin): clean var usage in plugin source