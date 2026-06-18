# 任务：增强 design-handoff 自定义 Sketch 插件导出能力

## 背景

当前项目已确定使用自定义 Sketch 插件作为 Design Handoff 的标准入口。

UI 设计师后续使用我们的 Sketch 插件导出 Handoff Package，不再依赖旧 Sketch Measure 插件。

本任务只聚焦 packages/design-handoff 中的插件能力增强，目标是让我们的插件至少具备旧 Sketch Measure 的基础 handoff 能力，并额外导出 AI 可读的结构化产物。

## 目标

增强以下目录中的插件能力：

    packages/design-handoff/sketchplugin/ngm-ai-handoff.sketchplugin/Contents/Sketch/

最终插件导出目录至少包含：

    preview.html
    interaction-bridge.js
    meta.json
    layer-tree.json
    texts.json
    styles.json
    tokens.json
    components.json
    assets-map.json
    handoff-map.json
    design-context.md
    agent-prompt.md
    screenshot.png
    assets/

## 核心要求

### 1. 学习并对齐旧 Sketch Measure 的基础能力

需要先理解旧 Sketch Measure 的核心 handoff 能力，包括：

- 画板导出
- HTML 预览
- 图层查看
- 文本查看
- 样式查看
- 颜色 / 字号 / 间距查看
- 图片 / 切图资源导出
- 给开发人员查看的静态交付页面

不要直接照搬旧 Sketch Measure 的实现结构，而是吸收它的能力，重新实现到我们的插件中。

### 2. 增强插件导出结构

当前插件需要导出标准 Handoff Package。

重点补齐：

- preview.html：给人看的设计稿预览
- layer-tree.json：完整图层树
- texts.json：文本信息
- styles.json：样式信息
- tokens.json：设计 Token
- components.json：基础组件识别结果
- assets-map.json：资源映射
- handoff-map.json：DOM 与 Handoff 节点映射
- design-context.md：AI 编码主上下文
- interaction-bridge.js：iframe 交互桥接脚本

### 3. preview.html 要可用

preview.html 至少需要做到：

- 能独立在浏览器打开
- 能展示画板
- 能展示主要图层
- 能展示文本
- 能展示基础形状
- 能展示图片资源
- 节点带 data-handoff-id
- 后续可被 iframe 加载

不要求第一版完全达到 Sketch Measure 的视觉还原度，但必须可用于人查看。

### 4. layer-tree.json 要增强

每个图层节点至少包含：

- id
- handoffId
- name
- type
- frame
- absoluteFrame
- artboardId
- parentId
- path
- hidden
- locked
- text
- styleRef
- role
- domSelector
- children

### 5. components.json 要增强

基础组件识别使用规则实现，不引入 AI 模型。

至少识别：

- navigation
- sidebar
- toolbar
- menu
- button
- input
- select
- form
- table
- list
- card
- modal
- drawer
- tabs
- breadcrumb
- chart
- unknown

每个组件至少包含：

- id
- layerId
- handoffId
- artboardId
- name
- inferredType
- confidence
- frame
- absoluteFrame
- text
- textList
- layerIds
- domSelector
- implementationHint

### 6. handoff-map.json 要生成

handoff-map.json 用于后续 iframe 点击联动右侧 Handoff 面板。

每个节点至少包含：

- handoffId
- layerId
- componentId
- artboardId
- type
- name
- domSelector
- frame

### 7. interaction-bridge.js 要生成

interaction-bridge.js 支持三个事件：

- ngm-handoff:ready
- ngm-handoff:select
- ngm-handoff:highlight

要求：

- iframe 加载完成后发送 ready
- 点击带 data-handoff-id 的节点时发送 select
- 接收 highlight 后高亮对应节点

### 8. design-context.md 要生成

design-context.md 是 AI 编码主入口。

内容包括：

- 页面基本信息
- 页面结构摘要
- 组件清单
- 文本摘要
- 设计 Tokens
- 资源说明
- Angular 实现建议
- AI 实现约束
- 已知问题

必须明确：

- AI 不要直接复制 preview.html DOM
- AI 不要用大规模绝对定位实现业务页面
- AI 应使用 Angular 组件化方式实现
- screenshot.png 只作为视觉参考
- components.json / tokens.json / assets-map.json 是结构化参考

## 优先修改范围

主要修改：

    packages/design-handoff/sketchplugin/ngm-ai-handoff.sketchplugin/Contents/Sketch/

重点文件：

    main.js
    exporter.js
    normalize-layer.js
    style-extractor.js
    component-infer.js
    prompt-generator.js
    settings.js

可以新增：

    preview-renderer.js
    interaction-bridge-template.js
    handoff-map-generator.js
    design-context-generator.js
    asset-exporter.js

必要时修改：

    packages/design-handoff/src/schema/
    packages/design-handoff/src/parser/
    packages/design-handoff/src/validators/
    packages/design-handoff/src/scanner/

## 不要做

- 不接入 Hub V2 页面
- 不实现 iframe 右侧面板联动页面逻辑
- 不增强 .sketch 文件直接解析能力
- 不解析旧 Sketch Measure HTML
- 不做普通 HTML 转 Handoff
- 不引入 AI 模型
- 不做复杂云端协作
- 不做账号权限
- 不重写整个 packages/design-handoff
- 不做无关重构

## 执行步骤

### Step 1：分析现有插件能力

输出：

    packages/design-handoff/docs/plugin-capability-audit.md

内容包括：

- 当前插件已能导出什么
- 距离旧 Sketch Measure 基础能力还缺什么
- 当前哪些模块可以复用
- 需要新增哪些模块

### Step 2：补齐标准导出目录

确保插件导出后包含：

    preview.html
    interaction-bridge.js
    meta.json
    layer-tree.json
    texts.json
    styles.json
    tokens.json
    components.json
    assets-map.json
    handoff-map.json
    design-context.md
    agent-prompt.md
    screenshot.png
    assets/

### Step 3：增强图层导出

补齐：

- handoffId
- artboardId
- parentId
- path
- absoluteFrame
- role
- domSelector

### Step 4：生成 preview.html

要求：

- 能打开
- 能预览
- 能点击
- DOM 节点带 data-handoff-id
- 引入 interaction-bridge.js

### Step 5：生成 handoff-map.json

用于后续 iframe 与右侧面板联动。

### Step 6：增强 components.json

完成基础组件识别，并关联 layer。

### Step 7：增强 assets-map.json

至少支持：

- screenshot
- bitmap
- slice
- 基础图片资源

### Step 8：生成 design-context.md

生成 AI 可读的页面上下文。

### Step 9：更新 parser / validator / scanner

让工具链能识别新的 Handoff Package。

### Step 10：补充 smoke test

验证标准导出包结构完整。

## 验收标准

### 插件导出

- 能导出标准 Handoff Package
- 包含 preview.html
- 包含 interaction-bridge.js
- 包含 handoff-map.json
- 包含 design-context.md
- 包含 screenshot.png
- 包含 assets-map.json

### preview.html

- 可以独立打开
- 可以展示画板
- 可以展示文本
- 可以展示基础图层
- 节点包含 data-handoff-id
- 点击节点能触发 ngm-handoff:select
- 接收 ngm-handoff:highlight 后能高亮节点

### JSON 产物

- layer-tree.json 每个节点有 handoffId
- components.json 组件有关联 layerId
- handoff-map.json 可以通过 handoffId 定位节点
- tokens.json 有基础颜色、字号、圆角
- assets-map.json 至少记录 screenshot

### AI 上下文

- design-context.md 可读
- 明确页面结构
- 明确组件清单
- 明确 tokens 和资源
- 明确禁止 AI 复制 preview.html DOM
- 明确要求 Angular 组件化实现

### 工程质量

- npm run build 通过
- npm run test 通过，或明确记录失败原因
- 不破坏现有脚本
- 不做无关重构
