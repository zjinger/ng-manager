# ng-manager Design Handoff 架构方案 v2

> 版本：v2.0  
> 适用范围：`packages/design-handoff`、`packages/design-handoff-sketch-plugin`、`apps/hub-v2`、AI Agent 编码链路  
> 当前决策：以 **自定义 Sketch 插件导出 Handoff Package** 为唯一标准主链路；`packages/design-handoff` 只作为 Handoff Package 中间件 / SDK；Sketch 插件独立为 `packages/design-handoff-sketch-plugin`。  
> 参考对象：Sketch Measure 只作为插件结构、资源导出、HTML Handoff 体验的参考，不作为依赖，不照搬老旧实现。

---

## 1. 背景更新

早期方案中，`packages/design-handoff` 同时承担 Handoff Package 中间件与 Sketch 插件能力。随着插件能力增强，这种结构已经不适合长期维护。

当前已经明确拆分为：

```text
packages/
├── design-handoff/
│   └── Handoff Package middleware / SDK
│
└── design-handoff-sketch-plugin/
    └── Sketch plugin exporter
```

新的目标不是简单“替代 Sketch Measure”，而是建立一条可被 ng-manager / Hub V2 / AI Agent 共同消费的设计交付链路：

```text
Sketch
  ↓
ng-manager 自定义 Sketch 插件
  ↓
标准 Handoff Package
  ↓
Hub V2 / ng-manager Handoff 工作台
  ↓
AI Agent 读取结构化上下文
  ↓
Angular 页面实现
```

---

## 2. 当前核心结论

### 2.1 主链路

标准主链路为：

```text
UI 设计师
  ↓
Sketch
  ↓
packages/design-handoff-sketch-plugin
  ↓
导出 Handoff Package
  ↓
Hub V2 / ng-manager 导入
  ↓
preview.html 预览 + Handoff 面板
  ↓
AI Agent 基于 design-context.md / JSON / assets 实现 Angular 页面
```

### 2.2 非主链路

以下能力不作为当前主链路：

| 能力 | 当前定位 |
|---|---|
| 旧 Sketch Measure HTML 解析 | 历史兼容 / 低优先级兜底 |
| `.sketch` 文件直接解析 | 未来可选项 / 调试辅助 |
| 普通 HTML 转 Handoff | 最弱兜底 |
| AI 直接读取 preview DOM 编码 | 禁止作为主方式 |

### 2.3 参考 Sketch Measure 的边界

可以参考：

- 插件产物结构
- `Contents/Sketch` 与 `Contents/Resources` 分层
- 进度条体验
- HTML Handoff 站点形态
- 资源面板 / 图层面板 / inspect 体验
- Sketch 插件本地目录：D:\design-handoff-github\sketch-meaxure

不应照搬：

- 老旧实现方式
- 老 webpack/skpm 配置
- 老历史兼容代码
- 传统绝对定位 DOM 作为 AI 编码输入
- 旧插件的数据格式

---

## 3. 包职责边界

## 3.1 `packages/design-handoff`

定位：

```text
Handoff Package middleware / SDK
```

职责：

- Handoff schema
- parser
- validator
- scanner
- Handoff Package manifest
- design-context 读取
- handoff-map 读取
- assets-map 读取
- Agent task 生成
- CLI 校验脚本
- Hub V2 / MCP / AI Agent 可复用能力

不允许承担：

- Sketch 插件菜单
- Sketch Runtime API
- Cocoa API
- `.sketchplugin` 产物
- `manifest.json`
- Sketch UI / NSWindow / NSAlert
- 插件打包逻辑

推荐结构：

```text
packages/design-handoff/
├── src/
│   ├── schema/
│   ├── parser/
│   ├── validators/
│   ├── scanner/
│   ├── generator/
│   └── agent/
├── scripts/
│   ├── validate-handoff.js
│   ├── scan-handoff-packages.js
│   └── create-agent-task.js
├── package.json
└── README.md
```

---

## 3.2 `packages/design-handoff-sketch-plugin`

定位：

```text
Sketch plugin exporter
```

职责：

- Sketch 插件菜单
- 中文化操作
- 导出选中画板
- 导出当前页面
- 导出整个文档
- 自定义勾选导出
- 诊断插件环境
- 扫描当前页面
- 进度条 / 日志 / export-result
- Artboard 收集
- Layer 归一化
- 样式提取
- 资源导出
- screenshot 导出
- preview.html 生成
- Handoff Package 写入
- `.sketchplugin` 打包

推荐源码结构：

```text
packages/design-handoff-sketch-plugin/
├── src/
│   ├── main.ts
│   ├── commands/
│   ├── sketch/
│   ├── export/
│   ├── handoff/
│   ├── preview/
│   ├── ui/
│   ├── debug/
│   ├── i18n/
│   └── types/
│
├── resources/
│   ├── templates/
│   ├── panel/
│   ├── styles/
│   └── i18n/
│
├── sketchplugin/
│   └── ngm-ai-handoff.sketchplugin/
│       └── Contents/
│           ├── Sketch/
│           └── Resources/
│
├── scripts/
│   ├── build-plugin.ts
│   └── pack-sketch-plugin.ts
│
├── package.json
└── README.md
```

依赖方向：

```text
@ yinuo-ngm/design-handoff-sketch-plugin
  depends on
@ yinuo-ngm/design-handoff
```

反向依赖禁止。

---

## 4. Sketch 插件产物结构

### 4.1 当前目标结构

第一阶段目标：

```text
ngm-ai-handoff.sketchplugin/
└── Contents/
    ├── Sketch/
    │   ├── manifest.json
    │   ├── main-bundle.js
    │   ├── canary.js
    │   ├── command-export-selected-artboard.js
    │   ├── command-export-current-page.js
    │   ├── command-export-whole-document.js
    │   ├── command-export-custom.js
    │   ├── command-open-settings.js
    │   ├── command-diagnose-plugin-environment.js
    │   └── command-scan-current-page.js
    │
    └── Resources/
        ├── templates/
        ├── panel/
        ├── styles/
        └── i18n/
```

要求：

- `Contents/Sketch` 不再保留业务散件 JS。
- 业务逻辑集中在 `main-bundle.js`。
- `command-xxx.js` 仅作为薄入口。
- `canary.js` 仅作为开发诊断入口。
- resources 应位于 `Contents/Resources`，而不是 `Contents/Sketch/resources`。

### 4.2 后续理想结构

插件稳定后可收敛为：

```text
ngm-ai-handoff.sketchplugin/
└── Contents/
    ├── Sketch/
    │   ├── manifest.json
    │   └── main-bundle.js
    │
    └── Resources/
        ├── templates/
        ├── panel/
        ├── styles/
        └── i18n/
```

即所有 command 直接指向 `main-bundle.js` 中的 handler。

---

## 5. Handoff Package 标准 v2

### 5.1 文档级导出目录

导出整个文档、当前页面或自定义导出时，应生成文档级根目录：

```text
documentName/
├── handoff-index.json
├── index.html
├── export-result.json
├── ngm-ai-handoff.log
├── page-001-pageName/
│   ├── artboard-001-artboardName__shortId/
│   └── artboard-002-artboardName__shortId/
└── page-002-pageName/
    └── artboard-001-artboardName__shortId/
```

### 5.2 Artboard 级 Handoff Package

每个 Artboard 独立输出：

```text
artboard-001-artboardName__shortId/
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
├── preview.css
├── preview.js
├── preview-data.json
├── screenshot.png
├── interaction-bridge.js
└── assets/
    ├── images/
    ├── icons/
    ├── slices/
    ├── symbols/
    ├── vectors/
    └── misc/
```

### 5.3 文件职责

| 文件 | 使用者 | 职责 |
|---|---|---|
| `handoff-index.json` | 平台 | 文档级索引 |
| `export-result.json` | 人 / 系统 | 导出结果、成功失败、日志路径 |
| `ngm-ai-handoff.log` | 调试 | 导出日志 |
| `preview.html` | 人 / iframe | 设计预览、图层 inspect |
| `preview.css` | preview | 预览样式 |
| `preview.js` | preview | 预览交互 |
| `preview-data.json` | preview / 平台 | preview 渲染数据 |
| `interaction-bridge.js` | iframe | iframe 与父页面通信 |
| `handoff.json` | 平台 | Artboard 包入口 |
| `meta.json` | 平台 / AI | 元信息 |
| `layer-tree.json` | 系统 / AI | 原始图层树 |
| `texts.json` | 系统 / AI | 文本清单 |
| `styles.json` | 系统 / AI | 样式清单 |
| `tokens.json` | 前端 / AI | 设计 Token |
| `components.json` | 系统 / AI | 组件推断 |
| `assets-map.json` | 系统 / AI / preview | 资源映射 |
| `handoff-map.json` | 工作台 | DOM / Handoff 映射 |
| `design-context.md` | AI | 编码主上下文 |
| `agent-prompt.md` | AI Agent | 编码任务提示 |
| `screenshot.png` | 人 / AI | 视觉对照 |
| `assets/` | preview / 前端 | 图片、图标、切图资源 |

---

## 6. 插件导出能力

### 6.1 导出模式

插件必须支持：

| 菜单 | 说明 |
|---|---|
| 导出选中画板 | 选中 Artboard 或其内部图层，自动定位所属 Artboard |
| 导出当前页面 | 导出当前 Page 下所有可见 Artboard |
| 导出整个文档 | 遍历所有 Page / Artboard |
| 自定义导出 | 勾选 Page / Artboard 后导出 |
| 设置 | 设置输出目录、是否导出 screenshot 等 |
| 诊断插件环境 | 检查文档、Page、选中图层、输出目录、Sketch 版本 |
| 扫描当前页面 | 只扫描 Artboard，不导出 Handoff Package |
| 测试插件入口 | Canary，用于确认 Sketch 是否成功加载插件 |

### 6.2 导出体验

必须具备：

- 中文菜单
- 中文提示
- 进度窗口
- 当前阶段
- 当前 Page / Artboard
- current / total
- 取消按钮
- 导出完成摘要
- 导出失败摘要
- 日志路径
- Finder 打开输出目录
- `export-result.json`

### 6.3 进度 UI

进度阶段建议：

```text
准备导出
收集画板
处理图层
提取文本
提取样式
提取 Token
推断组件
导出截图
导出资源
生成 Handoff Map
生成 Preview
生成 AI Context
写入文件
生成文档索引
完成
```

长耗时阶段必须支持细粒度进度：

```text
图层处理中... 277 / 430
资源导出中... 12 / 48
```

---

## 7. Asset Export v2

### 7.1 当前问题

早期 assets 导出只覆盖：

- Slice
- Image
- Bitmap

这不足以覆盖真实设计稿中的：

- Icon
- SymbolInstance
- ShapePath
- Vector
- Group icon
- Logo
- Exportable layer
- Library Symbol icon
- 组合图标

### 7.2 目标资源类型

`assets-map.json` 应支持：

```text
bitmap
image
slice
icon
vector
symbol
logo
exportable
misc
screenshot
```

### 7.3 资源目录

```text
assets/
├── images/
├── icons/
├── slices/
├── symbols/
├── vectors/
└── misc/
```

### 7.4 资源识别规则

1. `Slice` → slice
2. `Image / Bitmap` → bitmap
3. 有 `exportFormats / exportable` → exportable
4. `SymbolInstance` → symbol
5. 名称命中 `icon / 图标 / svg / logo` → icon / logo
6. 小尺寸 `ShapePath` → vector / icon
7. 小尺寸 Group 且内部主要为 ShapePath / Shape → icon
8. 复杂组合资源 → misc，png 兜底

### 7.5 导出策略

| 类型 | 优先格式 | 兜底 |
|---|---|---|
| bitmap / image | png | png |
| slice | png | png |
| icon / vector | svg | png |
| logo | svg | png |
| symbol | png | png |
| exportable | Sketch exportFormats | png |
| misc | png | png |

### 7.6 文件名策略

禁止假设 Sketch 导出文件名固定。

必须使用：

```text
导出前扫描目录
执行 sketch.export
导出后扫描目录
计算新增文件
重命名为稳定文件名
写入 assets-map.json
```

稳定文件名：

```text
<assetType>-<index>-<safeName>__<shortId>.<ext>
```

### 7.7 Asset 字段

每个 asset 至少包含：

```text
id
name
layerId
handoffId
artboardId
type
format
path
width
height
frame
absoluteFrame
sourceLayerType
sourceName
exportStatus
exportReason
warnings
```

### 7.8 容错

单个资源失败：

- 不终止 Artboard 导出
- 写入 warnings
- 写入日志
- 写入 export-result.json
- preview 允许 fallback

---

## 8. Pure HTML Preview v2

### 8.1 定位更新

`preview.html` 的定位从“可点击视觉预览”升级为：

```text
可独立打开的 HTML Handoff 页面
```

它应服务：

- UI / 前端人工查看
- Hub V2 iframe 预览
- 图层 inspect
- 资源查看
- CSS 参考
- Handoff 面板联动

但仍然不作为 AI 编码的主要事实来源。AI 主输入仍是：

```text
design-context.md
components.json
tokens.json
styles.json
assets-map.json
screenshot.png
```

### 8.2 Preview 输出文件

```text
preview.html
preview.css
preview.js
preview-data.json
interaction-bridge.js
```

### 8.3 Preview Render Model

不要直接从 layer-tree 拼 HTML。

新增中间模型：

```text
PreviewDocument
PreviewArtboard
PreviewNode
PreviewStyle
PreviewAssetRef
PreviewInspectorData
```

每个 PreviewNode：

```text
id
handoffId
layerId
parentId
artboardId
name
type
role
frame
absoluteFrame
zIndex
visible
text
style
assetRef
children
renderStrategy
inspect
```

renderStrategy：

```text
dom
text
shape
image
svg
group
component
ignore
fallback
```

### 8.4 DOM 化范围

至少支持：

- Artboard
- Group
- Text
- Shape
- ShapePath
- Bitmap
- Image
- Slice
- Icon asset
- Vector asset
- Symbol asset
- Button-like group
- Input-like group
- Card-like group
- Table-like group
- Navigation-like group
- Sidebar-like group

### 8.5 CSS 还原范围

至少支持：

- position
- left / top / width / height
- z-index
- opacity
- background
- border
- border-radius
- box-shadow
- font-family
- font-size
- font-weight
- color
- line-height
- text-align
- letter-spacing
- overflow
- transform / rotation
- display

复杂能力可写入 warnings：

- mask
- blend mode
- blur
- gradient 精细还原
- boolean path 精确还原
- symbol override 完整还原

### 8.6 Preview 面板

`preview.html` 应逐步具备：

- 页面 / Artboard 导航
- 图层树
- Inspect 面板
- 样式面板
- 资源面板
- CSS 片段
- 组件信息
- screenshot 对照层

第一版必做：

- 图层树
- 节点点击高亮
- 基础 inspect
- 资源列表
- screenshot 显示 / 隐藏

暂缓：

- 距离测量
- 自动吸附标注
- 完整 CSS 复制
- 复杂动画

---

## 9. iframe 联动协议

继续保留：

```text
ngm-handoff:ready
ngm-handoff:select
ngm-handoff:highlight
```

所有关键 DOM 节点必须保留：

```text
data-handoff-id
data-layer-id
data-artboard-id
data-handoff-type
data-handoff-name
```

要求：

- iframe 点击节点 → 父页面收到 `ngm-handoff:select`
- 父页面点击 Handoff 节点 → iframe 收到 `ngm-handoff:highlight`
- preview 内部图层树点击也使用同一套 `handoffId`
- `handoff-map.json` 与 `preview-data.json` 中 ID 必须一致

---

## 10. Hub V2 / ng-manager 工作台

### 10.1 工作台定位

Hub V2 / ng-manager Handoff 工作台负责：

- 导入 Handoff Package
- 读取 `handoff-index.json`
- 管理多个 Page / Artboard
- iframe 展示 `preview.html`
- 右侧读取 JSON 产物
- 监听 iframe postMessage
- 展示结构化 Handoff 面板
- 生成 AI Agent 任务

### 10.2 右侧面板 Tab

推荐：

```text
概览
页面
组件
图层
样式
资源
代码
问题
日志
```

### 10.3 不依赖 iframe DOM 作为数据事实

右侧面板读取：

```text
handoff.json
layer-tree.json
components.json
styles.json
tokens.json
assets-map.json
handoff-map.json
design-context.md
export-result.json
```

不应从 `preview.html` DOM 反向解析数据。

---

## 11. AI Agent 使用方式

AI Agent 主输入：

```text
design-context.md
components.json
tokens.json
styles.json
assets-map.json
screenshot.png
```

AI Agent 辅助输入：

```text
layer-tree.json
texts.json
handoff-map.json
preview-data.json
```

AI 不应：

- 复制 `preview.html` DOM
- 大规模使用绝对定位还原业务页面
- 直接照搬 Sketch Measure / preview 生成结构
- 忽略目标项目 Angular 结构

AI 应：

- 使用 Angular 组件化实现
- 使用 NG-ZORRO 或目标项目组件库
- 以 tokens 作为样式参考
- 以 assets-map 引用资源
- 以 screenshot 做视觉对照
- 输出可维护代码

---

## 12. 当前阶段规划

## Phase 0：架构拆分与基线

状态：已完成 / 基本完成

目标：

- `design-handoff` 与 `design-handoff-sketch-plugin` 拆分
- Handoff SDK 与 Sketch 插件职责分离
- build / pack / validate 链路建立

验收：

- `packages/design-handoff` 不包含 sketchplugin
- `packages/design-handoff-sketch-plugin` 独立存在
- 插件包依赖 Handoff SDK
- 中间件可在 Windows 上测试
- 插件可在 Mac 上人工验证

---

## Phase 1：插件产物结构收敛

目标：

- `Contents/Sketch` 清理业务散件 JS
- runtime 业务逻辑进入 `main-bundle.js`
- resources 移到 `Contents/Resources`
- 保留 command wrappers 作为过渡

验收：

- `Contents/Sketch` 不再出现 `exporter.js / settings.js / preview-renderer.js` 等散件
- `Contents/Sketch/main-bundle.js` 存在
- `Contents/Resources` 存在
- `npm run build` 通过
- `npm run pack:sketch` 通过
- 插件菜单不丢失

---

## Phase 2：插件 UI 与调试体验

目标：

- 专业进度窗口
- 取消按钮
- 图层级进度
- 资源级进度
- 完成 / 失败摘要
- 导出日志
- export-result.json
- 诊断菜单
- 扫描菜单

验收：

- 导出时立即出现进度窗口
- 能显示 `图层处理中... current / total`
- 能显示 `资源导出中... current / total`
- 可取消导出
- 失败时有明确错误和日志路径
- `ngm-ai-handoff.log` 生成
- `export-result.json` 生成

---

## Phase 3：Asset Export v2

目标：

- 图标、Symbol、矢量、Logo、切片完整导出
- assets 分类目录
- assets-map 字段增强
- 资源失败容错

验收：

- assets-map 不再只包含 bitmap / slice
- icon / symbol / vector / logo 能进入 assets-map
- 导出文件名稳定
- 单个资源失败不阻断 Artboard 导出
- preview 能引用 assets

---

## Phase 4：Pure HTML Preview v2

目标：

- preview 从基础预览升级为 HTML Handoff 页面
- DOM 化渲染文本、形状、图片、图标、组件
- 图层树
- Inspect 面板
- 资源面板
- screenshot 对照层

验收：

- preview.html 不以 screenshot 作为主视觉
- text / shape / image / icon 可见
- 图层树可点击
- Inspect 面板可显示节点信息
- 资源面板可显示 assets
- `ngm-handoff:select/highlight` 不破坏

---

## Phase 5：Hub V2 Handoff 工作台

目标：

- 导入 Handoff Package
- 展示文档级索引
- iframe 展示 preview
- 右侧 Handoff 面板读取 JSON
- iframe 与面板联动
- AI 任务生成

验收：

- 能导入 document-level package
- 能切换 Page / Artboard
- iframe 点击节点后右侧面板联动
- 右侧点击节点后 iframe 高亮
- 能复制 Agent Prompt

---

## Phase 6：AI Agent 编码闭环

目标：

- 根据 Handoff Package 生成 Angular 编码任务
- 输出项目可维护代码
- 与 ng-manager 本地工程绑定

验收：

- AI 使用 design-context / components / tokens / assets
- 不复制 preview DOM
- 能生成 Angular 组件拆分建议
- 能输出验收标准
- 能落到目标工程目录

---

## 13. 风险与应对

### 13.1 preview 还原度不足

应对：

- Asset Export v2 先行
- preview 使用 screenshot 对照层
- 不追求一次性 100% 还原
- 对 unsupported layer 写入 warnings

### 13.2 资源导出不完整

应对：

- 扩展 asset candidate
- svg / png 双策略
- 文件名导出前后扫描
- 单资源失败不阻断整体导出

### 13.3 Sketch Runtime 调试困难

应对：

- canary 菜单
- diagnostics 菜单
- scan current page 菜单
- safeRun
- debug logger
- export-result.json
- 进度窗口

### 13.4 TypeScript 化不彻底

应对：

- 构建产物允许 `var`
- 源码逐步使用 `const / let`
- 先处理纯逻辑模块
- Runtime 模块最后处理
- 渐进移除 `@ts-nocheck`

### 13.5 AI 复制 preview DOM

应对：

- design-context 明确禁止
- agent-prompt 明确禁止
- Hub V2 代码任务中强调 Angular 组件化
- preview 仅作为人类 inspect 与视觉参考

---

## 14. 当前推荐落地顺序

```text
1. 插件产物结构收敛
2. 插件进度 UI 与调试体验优化
3. Asset Export v2
4. Pure HTML Preview v2
5. Hub V2 Handoff 工作台
6. AI Agent 编码闭环
```

不要跳过 `Asset Export v2` 直接做 `Pure HTML Preview v2`，否则 preview 会因为资源缺失而无法接近 Sketch Measure 的视觉效果。

---

## 15. 最终定位

更新后的 Design Handoff 不是“新的 Sketch Measure”，而是：

```text
Sketch 设计源
  ↓
ng-manager Sketch Plugin
  ↓
标准 Handoff Package
  ↓
Pure HTML Handoff Preview
  ↓
Hub V2 / ng-manager Handoff 工作台
  ↓
AI Agent 工程化编码
```

Sketch Measure 是参考对象，不是依赖对象。

最终目标：

- 人可以看：Pure HTML Preview + Inspect Panel
- 系统可以读：Handoff JSON / Index / Map
- AI 可以用：design-context / components / tokens / assets
- 工程可以落地：Angular 组件化实现
