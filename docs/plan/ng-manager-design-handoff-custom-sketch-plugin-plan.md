# ng-manager Design Handoff 自定义 Sketch 插件方案

> 版本：v1.0  
> 适用范围：`ng-manager / packages/design-handoff`、`apps/hub-v2` 设计稿预览与 AI 编码链路  
> 决策结论：以 **自定义 Sketch 插件** 作为正式主链路，导出「给人看的 HTML」与「给系统 / AI 读的 Handoff 产物」，不再依赖旧 Sketch Measure 插件作为标准流程。

---

## 1. 背景

当前公司前端研发流程中，UI 设计师使用 Sketch 进行设计，历史上通过 Sketch Measure 插件导出 HTML，前端开发人员再基于导出的 HTML 和视觉稿实现页面。

随着研发流程向 AI Agent 编码演进，传统 Sketch Measure HTML 存在以下问题：

1. HTML DOM 结构复杂，噪声大。
2. 语义信息缺失，AI 难以判断导航、表格、表单、按钮、卡片等组件。
3. 图层 ID、Symbol、Text Style、Shared Style、切图资源等 Sketch 源信息在 HTML 中丢失或弱化。
4. 无法稳定支持 iframe 中点击设计稿区域后联动右侧 Handoff 面板。
5. AI 不应该直接复刻 Sketch Measure 导出的绝对定位 DOM。

因此，需要将设计稿交付从「给人看的标注 HTML」升级为：

```text
设计稿
  ↓
自定义 Sketch 插件
  ↓
可预览 HTML + 结构化 Handoff 产物
  ↓
Handoff 工作台
  ↓
AI Agent 基于结构化上下文实现页面
```

---

## 2. 方案决策

### 2.1 明确主链路

正式主链路确定为：

```text
UI 设计师
  ↓
Sketch
  ↓
ng-manager 自定义 Sketch 插件
  ↓
导出 Handoff Package
  ↓
Hub V2 / ng-manager 导入
  ↓
iframe 展示 preview.html
  ↓
右侧 Handoff 面板展示结构化产物
  ↓
AI Agent 读取 design-context.md / JSON / screenshot 实现页面
```

### 2.2 不再依赖旧 Sketch Measure 插件

旧 Sketch Measure 插件不再作为标准流程依赖。

保留定位：

| 来源 | 定位 | 是否主链路 |
|---|---|---|
| 自定义 Sketch 插件 | 标准设计交付链路 | 是 |
| 旧 Sketch Measure HTML | 历史数据兼容、过渡兜底 | 否 |
| 直接解析 `.sketch` 文件 | 平台补充能力，可选 | 否 |
| 普通 HTML 解析 | 最弱兜底 | 否 |

### 2.3 核心原则

1. **HTML 只负责预览，不作为 AI 编码主输入。**
2. **Handoff JSON / Markdown 才是工程语义层。**
3. **iframe 点击联动必须基于稳定 ID，而不是坐标猜测。**
4. **AI 实现页面时禁止直接复刻 Sketch 导出的 DOM。**
5. **插件导出必须服务于工程实现，而不仅是视觉查看。**

---

## 3. 目标与非目标

### 3.1 当前目标

1. 自定义 Sketch 插件导出标准 Handoff Package。
2. Package 同时包含：
   - 给人看的 `preview.html`
   - 给系统读的结构化 JSON
   - 给 AI 读的 `design-context.md`
   - 给视觉对照的 `screenshot.png`
   - 给实现使用的资源目录
3. `preview.html` 能在 Hub V2 / ng-manager 中通过 iframe 预览。
4. 点击 iframe 中设计稿节点后，右侧 Handoff 面板能切换到对应节点。
5. 点击右侧 Handoff 节点后，iframe 中对应区域能高亮。
6. AI Agent 基于 Handoff 产物实现 Angular 页面。

### 3.2 当前非目标

1. 不做 IDE 替代品。
2. 不把 AI 对话作为主产品形态。
3. 不要求插件一次性完整实现所有 Sketch 能力。
4. 不让 AI 直接读取和复刻 `preview.html` DOM。
5. 不在早期设计复杂云端协作、账号、权限或远程执行逻辑。
6. 不把旧 Sketch Measure HTML 作为长期标准格式。

---

## 4. 整体架构

```text
Sketch
  ↓
ng-manager Sketch Plugin
  ↓
Handoff Package
  ├── preview.html
  ├── handoff.json
  ├── layer-tree.json
  ├── components.json
  ├── styles.json
  ├── tokens.json
  ├── assets-map.json
  ├── handoff-map.json
  ├── design-context.md
  ├── agent-prompt.md
  ├── screenshot.png
  └── assets/
        ↓
Hub V2 / ng-manager Design Handoff 工作台
  ├── iframe 预览 preview.html
  ├── 右侧 Handoff 面板
  ├── 组件树
  ├── 样式 Tokens
  ├── 资源列表
  ├── 问题列表
  └── AI 任务生成
        ↓
Codex / OpenCode / Cursor / 其他 Agent
        ↓
Angular 页面实现
```

---

## 5. 产物标准：Handoff Package

### 5.1 目录结构

推荐标准包结构如下：

```text
handoff-package/
├── meta.json
├── handoff.json
├── layer-tree.json
├── texts.json
├── styles.json
├── tokens.json
├── components.json
├── assets-map.json
├── handoff-map.json
├── design-context.md
├── agent-prompt.md
├── preview.html
├── screenshot.png
├── interaction-bridge.js
└── assets/
    ├── images/
    ├── icons/
    └── slices/
```

### 5.2 文件职责

| 文件 | 使用者 | 职责 |
|---|---|---|
| `preview.html` | 人 / iframe | 视觉预览、点击交互 |
| `interaction-bridge.js` | iframe | iframe 与父页面通信 |
| `handoff.json` | 平台 | 总入口、产物索引 |
| `meta.json` | 平台 / AI | 文档、画板、插件版本、导出时间 |
| `layer-tree.json` | 系统 / AI | Sketch 图层树 |
| `texts.json` | 系统 / AI | 文本节点清单 |
| `styles.json` | 系统 / AI | 详细样式 |
| `tokens.json` | AI / 前端 | 颜色、字号、圆角、间距等设计 Token |
| `components.json` | 系统 / AI | 语义组件识别结果 |
| `assets-map.json` | 系统 / AI | 资源与图层映射 |
| `handoff-map.json` | 工作台 | iframe DOM 与 Handoff 节点映射 |
| `design-context.md` | AI | 主要上下文入口 |
| `agent-prompt.md` | AI Agent | 编码任务提示 |
| `screenshot.png` | 人 / AI | 视觉对照 |
| `assets/` | 前端实现 | 图片、图标、切图资源 |

---

## 6. 插件导出内容要求

### 6.1 必须导出的信息

自定义 Sketch 插件必须至少导出以下信息：

1. 文档信息：
   - 文档名称
   - 文档路径
   - 页面名称
   - 画板名称
   - 插件版本
   - 导出时间

2. 画板信息：
   - Artboard ID
   - 名称
   - 宽高
   - 背景色
   - 截图

3. 图层树：
   - Layer ID
   - 名称
   - 类型
   - 父子关系
   - 相对坐标
   - 绝对坐标
   - 是否隐藏
   - 是否锁定
   - 文本内容
   - 样式引用

4. 文本信息：
   - 文本内容
   - 字体
   - 字号
   - 字重
   - 行高
   - 颜色
   - 坐标

5. 样式信息：
   - 填充色
   - 边框色
   - 边框宽度
   - 圆角
   - 透明度
   - 阴影
   - 文本样式

6. Token 信息：
   - 颜色
   - 字号
   - 字体
   - 行高
   - 圆角
   - 阴影
   - 间距

7. 组件信息：
   - 组件 ID
   - 对应 layerId
   - 类型
   - 置信度
   - 包含的 layerIds
   - 文本摘要
   - 坐标范围
   - 实现建议

8. 资源信息：
   - 图片
   - 图标
   - bitmap
   - slice
   - screenshot
   - 资源路径
   - 使用该资源的 layerId

9. iframe 联动信息：
   - `handoffId`
   - `domSelector`
   - `data-handoff-id`
   - `handoff-map.json`

---

## 7. HTML 预览产物要求

### 7.1 `preview.html` 的定位

`preview.html` 是给人看的，不是给 AI 直接读的。

它需要满足：

1. 在 iframe 中能完整展示设计稿。
2. 尽量还原 Sketch 视觉效果。
3. 每个关键节点带有稳定 `data-handoff-id`。
4. 内置或引用 `interaction-bridge.js`。
5. 支持点击节点通知父页面。
6. 支持父页面发送高亮指令。

### 7.2 DOM 标记规范

关键 DOM 节点必须包含：

```html
<div
  data-handoff-id="layer_abc123"
  data-layer-id="abc123"
  data-artboard-id="artboard_001"
  data-handoff-type="layer"
  data-handoff-name="顶部导航"
>
  ...
</div>
```

组件级节点建议包含：

```html
<div
  data-handoff-id="component_top_navigation"
  data-layer-id="abc123"
  data-artboard-id="artboard_001"
  data-handoff-type="component"
  data-component-type="navigation"
>
  ...
</div>
```

画板节点建议包含：

```html
<section
  data-handoff-id="artboard_001"
  data-artboard-id="artboard_001"
  data-handoff-type="artboard"
  data-handoff-name="外部数据源页面"
>
  ...
</section>
```

### 7.3 重要约束

1. `data-handoff-id` 必须稳定。
2. `data-handoff-id` 必须能在 `handoff-map.json` 中找到。
3. 不允许右侧面板依赖 HTML DOM 作为数据事实。
4. HTML 只作为点击事件和视觉预览承载层。
5. 同一个 layer / component 在 JSON 和 HTML 中必须使用同一套 ID。

---

## 8. iframe 联动协议

### 8.1 事件命名

统一使用：

```text
ngm-handoff:select
ngm-handoff:highlight
ngm-handoff:hover
ngm-handoff:ready
```

当前阶段必做：

```text
ngm-handoff:select
ngm-handoff:highlight
```

未来可选：

```text
ngm-handoff:hover
ngm-handoff:ready
```

### 8.2 iframe → 父页面：选择节点

用户点击 iframe 内节点时，iframe 发送：

```js
window.parent.postMessage({
  type: "ngm-handoff:select",
  handoffId: "layer_abc123",
  handoffType: "layer",
  layerId: "abc123",
  artboardId: "artboard_001",
  source: "ngm-preview"
}, "*");
```

父页面收到后：

1. 校验事件类型。
2. 读取 `handoffId`。
3. 从 `handoff-map.json` / `layer-tree.json` / `components.json` 中查找节点。
4. 更新右侧面板。
5. 同步组件树选中状态。
6. 可选：切换到对应 Tab，例如「组件」或「样式」。

### 8.3 父页面 → iframe：高亮节点

用户点击右侧 Handoff 面板节点时，父页面发送：

```js
iframe.contentWindow.postMessage({
  type: "ngm-handoff:highlight",
  handoffId: "layer_abc123"
}, "*");
```

iframe 收到后：

1. 查找 `[data-handoff-id="layer_abc123"]`。
2. 移除上一个选中态。
3. 添加选中态。
4. 滚动到可视区域。

### 8.4 iframe bridge 示例

```js
(function () {
  function findHandoffElement(target) {
    if (!target || !target.closest) return null;
    return target.closest("[data-handoff-id]");
  }

  document.addEventListener("click", function (event) {
    var el = findHandoffElement(event.target);
    if (!el) return;

    window.parent.postMessage({
      type: "ngm-handoff:select",
      handoffId: el.getAttribute("data-handoff-id"),
      handoffType: el.getAttribute("data-handoff-type") || "layer",
      layerId: el.getAttribute("data-layer-id") || "",
      artboardId: el.getAttribute("data-artboard-id") || "",
      source: "ngm-preview"
    }, "*");

    event.preventDefault();
    event.stopPropagation();
  }, true);

  window.addEventListener("message", function (event) {
    var data = event.data || {};
    if (data.type !== "ngm-handoff:highlight") return;

    var prev = document.querySelector("[data-ngm-handoff-selected='true']");
    if (prev) {
      prev.removeAttribute("data-ngm-handoff-selected");
    }

    var el = document.querySelector("[data-handoff-id='" + data.handoffId + "']");
    if (!el) return;

    el.setAttribute("data-ngm-handoff-selected", "true");
    el.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "center"
    });
  });

  window.parent.postMessage({
    type: "ngm-handoff:ready",
    source: "ngm-preview"
  }, "*");
})();
```

### 8.5 高亮样式

```css
[data-ngm-handoff-selected="true"] {
  outline: 2px solid #3b82f6 !important;
  outline-offset: 2px !important;
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.2) !important;
}
```

---

## 9. Handoff 数据模型建议

### 9.1 HandoffMeta

```ts
export interface HandoffMeta {
  pluginVersion: string;
  documentName: string;
  documentPath: string | null;
  pageName: string;
  artboardName: string;
  exportedAt: string;
  platform: "sketch";
}
```

### 9.2 HandoffFrame

```ts
export interface HandoffFrame {
  x: number;
  y: number;
  width: number;
  height: number;
}
```

### 9.3 HandoffLayerNode

```ts
export interface HandoffLayerNode {
  id: string;
  handoffId: string;

  name: string;
  type: string;

  artboardId: string;
  parentId: string | null;
  path: string[];

  frame: HandoffFrame;
  absoluteFrame: HandoffFrame;

  hidden: boolean;
  locked: boolean;

  text: string | null;
  styleRef?: string | null;

  domSelector?: string;
  role?: HandoffLayerRole;

  children: HandoffLayerNode[];
}
```

### 9.4 HandoffLayerRole

```ts
export type HandoffLayerRole =
  | "page"
  | "artboard"
  | "navigation"
  | "sidebar"
  | "toolbar"
  | "menu"
  | "button"
  | "input"
  | "select"
  | "form"
  | "table"
  | "list"
  | "card"
  | "modal"
  | "drawer"
  | "tabs"
  | "breadcrumb"
  | "chart"
  | "text"
  | "image"
  | "icon"
  | "container"
  | "unknown";
```

### 9.5 HandoffComponent

```ts
export interface HandoffComponent {
  id: string;
  layerId: string;
  handoffId: string;

  artboardId: string;
  name: string;

  inferredType: HandoffComponentType;
  confidence: number;

  frame: HandoffFrame;
  absoluteFrame: HandoffFrame;

  text: string | null;
  textList: string[];

  layerIds: string[];
  domSelector?: string;

  implementationHint?: {
    angularComponentName?: string;
    suggestedInputs?: string[];
    suggestedOutputs?: string[];
    notes?: string[];
  };
}
```

### 9.6 HandoffComponentType

```ts
export type HandoffComponentType =
  | "page"
  | "navigation"
  | "sidebar"
  | "toolbar"
  | "menu"
  | "button"
  | "input"
  | "select"
  | "form"
  | "table"
  | "list"
  | "card"
  | "modal"
  | "drawer"
  | "tabs"
  | "breadcrumb"
  | "chart"
  | "unknown";
```

### 9.7 HandoffDomMap

```ts
export interface HandoffDomMap {
  version: "1.0";
  source: "ngm-ai-handoff";
  nodes: HandoffDomMapNode[];
}
```

### 9.8 HandoffDomMapNode

```ts
export interface HandoffDomMapNode {
  handoffId: string;
  layerId: string;
  componentId?: string;
  artboardId: string;

  type: "artboard" | "layer" | "component" | "asset";

  name: string;
  domSelector: string;
  frame: HandoffFrame;
}
```

### 9.9 HandoffAsset

```ts
export interface HandoffAsset {
  id: string;
  name: string;
  layerId: string;

  type: "bitmap" | "slice" | "icon" | "sprite" | "screenshot" | "image";

  path: string;
  frame: HandoffFrame;

  hash?: string;
  usedByLayerIds?: string[];
}
```

---

## 10. 右侧 Handoff 面板设计

### 10.1 面板定位

右侧面板不是单纯展示信息，而是 Handoff 产物的控制台。

它负责：

1. 展示当前设计稿的结构化信息。
2. 响应 iframe 点击。
3. 支持组件树定位。
4. 支持样式和资源查看。
5. 支持复制 AI 上下文。
6. 支持生成 Agent 任务。

### 10.2 推荐 Tab

```text
概览
组件
图层
样式
资源
代码
问题
日志
```

### 10.3 概览

展示：

- 设计稿名称
- 页面名称
- 画板名称
- 插件版本
- 导出时间
- 图层数量
- 文本数量
- 组件数量
- 资源数量
- 问题数量

操作：

```text
[重新解析]
[导出产物]
[复制 AI 上下文]
[复制 Agent 任务]
```

### 10.4 组件

展示组件树：

```text
Page
├── TopNavigation
├── Sidebar
├── ContentArea
│   ├── SearchForm
│   ├── DataTable
│   └── Pagination
└── Footer
```

组件详情展示：

- 名称
- 类型
- 置信度
- layerId
- handoffId
- 坐标
- 文本
- 样式
- 实现建议

### 10.5 图层

展示原始图层树。

要求：

1. 支持搜索图层。
2. 支持点击图层后 iframe 高亮。
3. 支持展示图层路径。
4. 支持查看 frame、absoluteFrame、styleRef。

### 10.6 样式

展示：

- Colors
- Typography
- Radius
- Shadow
- Spacing
- Border

操作：

```text
[复制 CSS Variables]
[复制 SCSS Tokens]
[复制 Angular Theme]
```

### 10.7 资源

展示：

- screenshot
- bitmap
- slice
- icon
- image
- sprite

要求：

1. 能看到资源路径。
2. 能看到资源对应 layerId。
3. 能知道资源是否缺失。
4. 能复制资源引用路径。

### 10.8 代码

不是直接生成完整代码，而是生成 AI 任务上下文。

内容：

- Angular 组件拆分建议
- 输入文件清单
- 实现约束
- Codex / OpenCode / Cursor Prompt
- 验收标准

### 10.9 问题

展示导出或解析问题，例如：

- 图层命名为空
- 组件识别置信度低
- 资源缺失
- 文本被转图片
- 绝对定位过重
- Token 异常
- 画板过大
- 图层数量过多

### 10.10 日志

展示导出 / 导入 / 解析过程：

```text
10:20:01 读取 meta.json
10:20:02 加载 layer-tree.json
10:20:03 构建 handoff index
10:20:04 加载 preview.html
10:20:05 iframe ready
10:20:06 selected layer_abc123
```

---

## 11. AI 使用方式

### 11.1 AI 不直接读 `preview.html`

AI 编码时应该读取：

```text
design-context.md
components.json
tokens.json
styles.json
assets-map.json
screenshot.png
```

AI 不应该优先读取：

```text
preview.html
原始绝对定位 DOM
Sketch Measure 旧 HTML
```

### 11.2 `design-context.md` 内容结构

推荐：

```md
# Design Context

## 1. 基本信息

- 页面名称
- 来源文档
- 画板名称
- 导出时间
- 插件版本

## 2. 页面意图

描述页面业务用途。

## 3. 页面结构

描述页面主要区域。

## 4. 组件清单

列出识别出的组件。

## 5. 文本摘要

列出主要文本内容。

## 6. 设计 Tokens

列出主色、字号、圆角、间距。

## 7. 资源说明

说明图片、图标、切图使用情况。

## 8. Angular 实现建议

给出组件拆分和目录建议。

## 9. 实现约束

禁止复刻导出 DOM，必须语义化实现。

## 10. 已知问题

列出导出或识别问题。
```

### 11.3 AI Agent Prompt 原则

Agent Prompt 应明确：

1. 不允许复制 `preview.html` DOM。
2. 使用 Angular 组件化实现。
3. 以 `screenshot.png` 作为视觉参考。
4. 以 `components.json` 作为组件参考。
5. 以 `tokens.json` 作为设计规范。
6. 以 `assets-map.json` 作为资源参考。
7. 需要输出可维护代码，而不是像素级还原垃圾 DOM。

---

## 12. 与 ng-manager / Hub V2 的关系

### 12.1 `packages/design-handoff`

定位：

```text
本地 Handoff 能力包
```

职责：

1. 定义 schema。
2. 解析 Handoff Package。
3. 校验 Handoff Package。
4. 生成 AI 上下文。
5. 生成 Agent Prompt。
6. 扫描本地 Handoff 包。
7. 支持 `.sketch` 文件解析。
8. 支持 Sketch 插件打包。

### 12.2 自定义 Sketch 插件

定位：

```text
设计源头导出器
```

职责：

1. 从 Sketch 获取图层、样式、资源。
2. 生成 `preview.html`。
3. 生成结构化 JSON。
4. 生成 screenshot。
5. 生成 `design-context.md`。
6. 注入 iframe 交互协议。

### 12.3 Hub V2 / Web

定位：

```text
Handoff 工作台与协作展示层
```

职责：

1. 上传 / 导入 Handoff Package。
2. iframe 展示 `preview.html`。
3. 加载 JSON 产物。
4. 展示右侧 Handoff 面板。
5. 响应 iframe postMessage。
6. 支持复制 AI 任务。
7. 支持版本管理和历史记录。

### 12.4 ng-manager Desktop

定位：

```text
本地工程管理与自动化能力宿主
```

未来可选职责：

1. 本地扫描 Handoff Package。
2. 调用本地 Agent 实现页面。
3. 将 Handoff 产物与本地项目绑定。
4. 支持本地生成组件代码草稿。

---

## 13. 兼容策略

### 13.1 旧 Sketch Measure HTML

保留兼容导入能力，但不作为主链路。

处理方式：

```text
旧 Sketch Measure HTML / ZIP
  ↓
弱解析
  ↓
尽量生成 design-context.md
  ↓
无法保证 iframe 精确联动
```

限制：

1. 不能保证完整图层语义。
2. 不能保证组件识别准确。
3. 不能保证资源完整。
4. 不能保证 iframe 点击节点能匹配右侧面板。

### 13.2 `.sketch` 文件直接解析

作为补充能力。

适合场景：

1. UI 无法安装插件。
2. 需要平台批量解析。
3. 需要服务端或本地工具自动处理 Sketch 文件。

限制：

1. 可能无法获得插件环境下完整导出能力。
2. screenshot / slice / Symbol 处理可能受限。
3. 不替代插件主链路。

---

## 14. 阶段规划

### Phase 1：标准方案确认与 Schema 固化

目标：

```text
确定自定义 Sketch 插件为主链路
固化 Handoff Package 标准
```

产出：

1. 本方案文档。
2. Handoff Package 文件结构。
3. Handoff schema 草案。
4. iframe 联动协议。
5. AI 使用约束。

### Phase 2：插件导出增强

目标：

```text
插件能导出 preview.html + 完整 Handoff 产物
```

必做：

1. `preview.html`
2. `interaction-bridge.js`
3. `handoff.json`
4. `handoff-map.json`
5. `design-context.md`
6. layer / component / asset 关联字段
7. `data-handoff-id`

### Phase 3：Hub V2 工作台联动

目标：

```text
iframe 点击联动右侧 Handoff 面板
```

必做：

1. 父页面监听 `ngm-handoff:select`。
2. 右侧面板根据 `handoffId` 切换节点。
3. 右侧节点点击后 iframe 高亮。
4. 构建 `handoffIndex`。
5. 展示组件树、图层树、样式、资源。

### Phase 4：AI 任务生成

目标：

```text
Handoff 产物能直接驱动 AI Agent 编码
```

必做：

1. `design-context.md` 生成。
2. Codex / OpenCode / Cursor Prompt 模板。
3. Angular 组件拆分建议。
4. 验收标准生成。
5. 代码实现约束。

### Phase 5：兼容与增强

目标：

```text
保留旧数据处理能力，增强复杂设计稿支持
```

未来可选：

1. 旧 Sketch Measure HTML 弱解析。
2. `.sketch` 批量解析。
3. Symbol 识别增强。
4. Sprite / icon 切图增强。
5. 组件识别规则增强。
6. 设计问题检测。
7. 与项目研发项绑定。

---

## 15. 验收标准

### 15.1 插件导出验收

1. UI 设计师能在 Sketch 中选择画板导出。
2. 导出目录包含标准 Handoff Package。
3. `preview.html` 可以独立打开。
4. `screenshot.png` 正常生成。
5. `layer-tree.json` 有完整层级结构。
6. `components.json` 至少能识别常见组件。
7. `tokens.json` 包含颜色、字号、圆角等信息。
8. `handoff-map.json` 能映射 DOM 与 Handoff 节点。
9. `design-context.md` 能被 AI 直接阅读。

### 15.2 iframe 联动验收

1. iframe 加载 `preview.html` 正常。
2. 点击 iframe 内带 `data-handoff-id` 的节点，父页面收到 `ngm-handoff:select`。
3. 右侧面板能显示对应节点。
4. 点击右侧面板节点，iframe 能高亮对应 DOM。
5. iframe 高亮时能自动滚动到可视区域。
6. 不影响原始预览页面的正常展示。

### 15.3 AI 编码验收

1. AI 不直接复刻 `preview.html` DOM。
2. AI 能根据 `design-context.md` 理解页面结构。
3. AI 能根据 `components.json` 拆分 Angular 组件。
4. AI 能根据 `tokens.json` 设置样式。
5. AI 能根据 `assets-map.json` 引用资源。
6. 输出代码具备可维护性。

---

## 16. 风险与应对

### 16.1 UI 设计师安装插件成本

风险：

```text
设计师需要改变导出习惯。
```

应对：

1. 插件菜单命名清晰。
2. 一键导出。
3. 默认导出目录。
4. 不要求设计师理解 JSON。
5. 提供简短操作文档。

### 16.2 插件导出 HTML 还原度不足

风险：

```text
自定义 preview.html 初期可能不如 Sketch Measure 完整。
```

应对：

1. 初期以 screenshot 作为视觉对照。
2. preview.html 优先保证可查看和可点击。
3. 逐步增强视觉还原。
4. 不要求 preview.html 成为最终实现代码。

### 16.3 组件识别不准确

风险：

```text
命名不规范或设计结构复杂时，组件识别置信度低。
```

应对：

1. 保留 layer-tree 原始结构。
2. components.json 标记 confidence。
3. 支持人工修正组件类型。
4. 支持基于命名规范增强识别。

### 16.4 资源导出不完整

风险：

```text
图片、图标、sprite、slice 未完整导出。
```

应对：

1. 先支持 screenshot。
2. 再支持 bitmap。
3. 再支持 slice。
4. 最后处理 sprite / symbol icon。

### 16.5 AI 过度依赖视觉稿

风险：

```text
AI 可能尝试像素级复刻，生成不可维护代码。
```

应对：

1. Prompt 明确禁止复刻 DOM。
2. `design-context.md` 明确组件化实现。
3. 生成验收标准强调可维护性。
4. 页面实现以工程结构优先，视觉对齐为辅。

---

## 17. 推荐落地顺序

当前最推荐的落地顺序：

```text
1. 固化 Handoff Package 标准
2. 扩展 schema：handoffId / artboardId / parentId / domSelector
3. 插件导出 preview.html 时注入 data-handoff-id
4. 新增 handoff-map.json
5. 新增 interaction-bridge.js
6. Hub V2 iframe 监听 postMessage
7. 右侧面板接入 handoffIndex
8. 新增 design-context.md
9. 增强 components.json
10. 增强 assets-map.json
```

不要一开始就追求：

1. 完整替代 Sketch Measure 所有视觉能力。
2. 完整自动生成页面代码。
3. 高复杂度组件智能识别。
4. 复杂协作权限。
5. 云端 AI 自动执行。

---

## 18. 最终结论

本方案正式确定：

```text
ng-manager design-handoff 的主链路是自定义 Sketch 插件。
```

UI 设计师后续应使用自定义 Sketch 插件导出标准 Handoff Package，而不是继续依赖旧 Sketch Measure 插件。

自定义插件导出的内容必须同时服务三类对象：

| 对象 | 需要的产物 |
|---|---|
| 人 | `preview.html` / `screenshot.png` |
| 系统 | `handoff.json` / `layer-tree.json` / `components.json` / `handoff-map.json` |
| AI | `design-context.md` / `tokens.json` / `assets-map.json` / `agent-prompt.md` |

最终目标不是做一个新的 Sketch Measure，而是构建：

```text
Sketch 设计稿
  ↓
标准 Handoff Package
  ↓
Design Handoff 工作台
  ↓
AI Agent 可理解的工程上下文
  ↓
可维护的 Angular 页面实现
```

这条链路符合 ng-manager 的长期定位：本地优先、工程导向、插件化、可迁移、可展示。
