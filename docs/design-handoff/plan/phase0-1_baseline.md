# 任务：新增 Design Handoff 基线文档

## 目标

新增项目级 Design Handoff 基线文档，用于记录当前自定义 Sketch 插件的导出能力、现有产物、已知问题和下一步验证项。

## 文件路径

docs/design-handoff/baseline.md

## 内容要求

文档需要包含以下内容：

1. Design Handoff 当前主链路

说明当前标准链路是：

Sketch
→ ng-manager 自定义 Sketch 插件
→ Handoff Package
→ Hub V2 / ng-manager
→ iframe 预览 + Handoff 面板
→ AI Agent 实现 Angular 页面

明确当前标准输入是自定义 Sketch 插件导出的 Handoff Package。

2. 当前插件核心目录

记录插件目录：

packages/design-handoff/sketchplugin/ngm-ai-handoff.sketchplugin/Contents/Sketch/

记录当前核心文件：

- main.js
- exporter.js
- normalize-layer.js
- style-extractor.js
- component-infer.js
- prompt-generator.js
- settings.js
- handoff-map-generator.js
- preview-renderer.js
- interaction-bridge-template.js
- design-context-generator.js
- asset-exporter.js

3. 当前已支持导出文件

记录当前插件导出目录中应包含：

- meta.json
- handoff.json
- layer-tree.json
- texts.json
- styles.json
- tokens.json
- components.json
- assets-map.json
- handoff-map.json
- preview.html
- interaction-bridge.js
- design-context.md
- agent-prompt.md
- screenshot.png
- assets/

4. 当前已具备能力

简要说明：

- 支持 Artboard 导出
- 支持 screenshot 导出
- 支持 layer-tree.json
- 支持 styles.json
- 支持 tokens.json
- 支持 components.json
- 支持 handoff-map.json
- 支持 preview.html
- 支持 interaction-bridge.js
- 支持 design-context.md
- parser / validator 已开始支持新包结构

5. 当前已知问题

至少记录：

- preview.html 当前是 screenshot + hit box，不是完整旧 Sketch Measure DOM 化预览
- texts.json 还缺 handoffId / artboardId / absoluteFrame / domSelector
- assets-map.json 需要真实 Sketch 文件验证
- validator 还需要增强 handoff-map / preview / design-context 的结构校验
- 需要补充 build / test / pack:sketch 的实际执行结果

6. 下一步验证项

记录下一步需要做：

- 使用真实 Sketch 画板导出一次
- 检查导出目录是否完整
- 打开 preview.html 验证展示
- 点击节点验证 ngm-handoff:select
- 验证 ngm-handoff:highlight
- 检查 handoffId 是否能贯通 layer-tree / components / handoff-map
- 执行 npm run build
- 执行 npm run test
- 执行 npm run pack:sketch

## 不要做

- 不要改插件逻辑
- 不要改 Hub V2
- 不要新增功能
- 不要重构代码
- 不要增强 .sketch parser

## 验收标准

- docs/design-handoff/baseline.md 已创建
- 文档能说明当前插件导出能力
- 文档能说明当前已知问题
- 文档能说明下一步验证项
- 不包含无关实现代码
- 不修改业务代码

## 推荐提交信息

docs(design-handoff): add plugin export baseline