# ng-manager Design Handoff AI Agent 精简执行任务

> 目标：基于 `packages/design-handoff` 落地自定义 Sketch 插件主链路。  
> 原则：交给 Code AI Agent 执行，不展开实现代码，只描述任务目标、改造范围和验收标准。

---

## 1. 总体目标

通过自定义 Sketch 插件导出标准 Handoff Package，使 Hub V2 / ng-manager 能完成：

1. iframe 预览设计稿。
2. 右侧 Handoff 面板读取结构化产物。
3. iframe 点击节点后联动右侧面板。
4. 右侧面板点击节点后高亮 iframe 对应区域。
5. AI Agent 基于 Handoff 产物实现 Angular 页面。

标准链路：

```text
Sketch
  → 自定义 Sketch 插件
  → Handoff Package
  → Hub V2 / ng-manager
  → iframe 预览 + Handoff 面板
  → AI Agent 实现 Angular 页面
```

---

## 2. 当前阶段边界

### 必做

- 自定义 Sketch 插件导出标准包。
- 插件导出 `preview.html`。
- 插件导出结构化 JSON。
- 插件导出 `design-context.md`。
- Hub V2 / ng-manager 接入 iframe 联动。
- parser / validator / scanner 支持新包结构。

### 不做

- 不增强 `.sketch` 文件直接解析能力。
- 不解析旧 Sketch Measure HTML。
- 不做普通 HTML 转 Handoff。
- 不让 AI 直接复制 `preview.html` DOM。
- 不做复杂账号、权限、云协作。
- 不做 AI 直接控制 Sketch。

---

## 3. 标准 Handoff Package

插件导出的目录应包含：

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
├── interaction-bridge.js
├── screenshot.png
└── assets/
```

说明：

| 文件 | 作用 |
|---|---|
| `preview.html` | iframe 预览 |
| `interaction-bridge.js` | iframe 与父页面通信 |
| `handoff.json` | Handoff 总入口 |
| `layer-tree.json` | 图层树 |
| `components.json` | 组件识别结果 |
| `tokens.json` | 设计 Token |
| `assets-map.json` | 资源映射 |
| `handoff-map.json` | DOM 与 Handoff 节点映射 |
| `design-context.md` | AI 编码主上下文 |
| `agent-prompt.md` | Agent 任务提示 |
| `screenshot.png` | 视觉对照 |

---

## 4. 全局编码要求

AI Agent 执行时遵守：

1. 以 `packages/design-handoff/sketchplugin` 为主改造路径。
2. 每个阶段独立完成，不混入无关重构。
3. 不主动增强 `.sketch` parser。
4. 如果类型变更导致 `.sketch` parser 编译失败，只做最小兼容修复。
5. iframe 联动必须基于稳定 `handoffId`。
6. 右侧面板读取 Handoff 产物，不直接解析 iframe DOM。
7. AI 编码主输入是 `design-context.md`、`components.json`、`tokens.json`、`assets-map.json`、`screenshot.png`。
8. 每阶段完成后输出变更摘要、测试结果和遗留问题。

---

# Phase 0：基线检查

## 目标

确认当前 `packages/design-handoff` 的现状，避免后续改造破坏已有能力。

## 范围

```text
packages/design-handoff/package.json
packages/design-handoff/src/
packages/design-handoff/scripts/
packages/design-handoff/sketchplugin/
```

## 任务

1. 梳理当前 Sketch 插件导出链路。
2. 确认当前已导出的 Handoff 文件。
3. 执行或记录：
   - `npm run build`
   - `npm run test`
   - `npm run pack:sketch`
4. 新增简短基线文档：
   - `packages/design-handoff/docs/baseline.md`

## 验收

- build / test / pack:sketch 状态明确。
- 插件现有导出链路已记录。
- 无无关功能变更。

---

# Phase 1：扩展 Handoff Schema

## 目标

补齐交互式 Handoff Package 所需的数据字段。

## 范围

```text
packages/design-handoff/src/schema/
```

## 任务

1. 扩展图层节点字段：
   - `handoffId`
   - `artboardId`
   - `parentId`
   - `path`
   - `absoluteFrame`
   - `domSelector`
   - `role`
2. 扩展组件字段：
   - `layerId`
   - `handoffId`
   - `artboardId`
   - `absoluteFrame`
   - `textList`
   - `layerIds`
   - `domSelector`
   - `implementationHint`
3. 扩展组件类型：
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
4. 新增 DOM 映射类型：
   - `HandoffDomMap`
   - `HandoffDomMapNode`
5. 扩展资源类型：
   - bitmap
   - slice
   - icon
   - sprite
   - screenshot
   - image

## 验收

- TypeScript 编译通过。
- 新类型可正常导出。
- 旧 parser / validator / scanner 不被破坏。
- `.sketch` parser 如受影响，仅做最小兼容修复。

---

# Phase 2：增强插件图层导出

## 目标

让插件导出的 `layer-tree.json` 具备稳定定位能力。

## 范围

```text
packages/design-handoff/sketchplugin/ngm-ai-handoff.sketchplugin/Contents/Sketch/normalize-layer.js
packages/design-handoff/sketchplugin/ngm-ai-handoff.sketchplugin/Contents/Sketch/exporter.js
```

## 任务

1. 为每个图层生成稳定 `handoffId`。
2. 为每个图层写入：
   - `artboardId`
   - `parentId`
   - `path`
   - `absoluteFrame`
   - `domSelector`
   - `role`
3. 保留原有字段：
   - `id`
   - `name`
   - `type`
   - `frame`
   - `hidden`
   - `locked`
   - `text`
   - `styleRef`
   - `children`
4. 保证 screenshot、texts、styles、tokens 等原有导出不受影响。

## 验收

- `layer-tree.json` 中每个节点都有稳定 `handoffId`。
- 每个节点具备面板联动所需字段。
- 原有导出能力不丢失。
- build / test 通过。

---

# Phase 3：生成 handoff-map.json

## 目标

生成 DOM 与 Handoff 节点的映射文件，供 iframe 联动使用。

## 范围

```text
packages/design-handoff/sketchplugin/ngm-ai-handoff.sketchplugin/Contents/Sketch/
```

## 任务

1. 新增 handoff map 生成逻辑。
2. 从 `layer-tree.json` 生成节点映射。
3. 从 `components.json` 生成组件映射。
4. 插件导出时写入：
   - `handoff-map.json`

## `handoff-map.json` 应包含

- `version`
- `source`
- `nodes`

每个 node 至少包含：

- `handoffId`
- `layerId`
- `componentId`
- `artboardId`
- `type`
- `name`
- `domSelector`
- `frame`

## 验收

- 导出目录包含 `handoff-map.json`。
- `nodes` 非空。
- 每个节点能通过 `handoffId` 定位。
- build / test 通过。

---

# Phase 4：生成 preview.html 与 interaction-bridge.js

## 目标

导出可在 iframe 中展示和交互的预览 HTML。

## 范围

```text
packages/design-handoff/sketchplugin/ngm-ai-handoff.sketchplugin/Contents/Sketch/
```

## 任务

1. 新增 `preview.html` 生成逻辑。
2. 新增 `interaction-bridge.js`。
3. `preview.html` 中每个关键节点写入：
   - `data-handoff-id`
   - `data-layer-id`
   - `data-artboard-id`
   - `data-handoff-type`
   - `data-handoff-name`
4. `interaction-bridge.js` 支持：
   - iframe ready 通知
   - iframe 点击节点通知父页面
   - 父页面通知 iframe 高亮节点
5. 插件导出时写入：
   - `preview.html`
   - `interaction-bridge.js`

## 事件协议

- `ngm-handoff:ready`
- `ngm-handoff:select`
- `ngm-handoff:highlight`

## 验收

- `preview.html` 可独立打开。
- iframe 中点击节点能发送 select 事件。
- 接收 highlight 事件后能高亮节点。
- 不影响 screenshot 导出。
- build / test 通过。

---

# Phase 5：增强 components.json

## 目标

让组件识别结果能用于右侧面板和 AI 编码。

## 范围

```text
packages/design-handoff/sketchplugin/ngm-ai-handoff.sketchplugin/Contents/Sketch/component-infer.js
packages/design-handoff/sketchplugin/ngm-ai-handoff.sketchplugin/Contents/Sketch/exporter.js
```

## 任务

1. 扩展组件类型识别。
2. 每个组件关联原始 layer。
3. 每个组件写入：
   - `id`
   - `layerId`
   - `handoffId`
   - `artboardId`
   - `name`
   - `inferredType`
   - `confidence`
   - `frame`
   - `absoluteFrame`
   - `text`
   - `textList`
   - `layerIds`
   - `domSelector`
   - `implementationHint`
4. 生成基础 Angular 组件实现建议。
5. 组件识别不确定时使用 `unknown`，不要丢弃节点。

## 验收

- `components.json` 中组件能关联 layer。
- 每个 component 有 `handoffId`。
- 每个 component 有 `domSelector`。
- 能识别常见组件：导航、菜单、按钮、表单、表格、卡片。
- build / test 通过。

---

# Phase 6：生成 design-context.md

## 目标

生成 AI Agent 编码主上下文。

## 范围

```text
packages/design-handoff/sketchplugin/ngm-ai-handoff.sketchplugin/Contents/Sketch/
```

## 任务

1. 新增 `design-context.md` 生成逻辑。
2. 内容包括：
   - 基本信息
   - 页面摘要
   - 页面结构
   - 组件清单
   - 文本摘要
   - 设计 Tokens
   - 资源说明
   - Angular 实现建议
   - AI 实现约束
   - 已知问题
3. 更新 `agent-prompt.md`，要求 AI 优先读取 `design-context.md`。
4. 明确约束：
   - 不复制 `preview.html` DOM。
   - 不使用大规模绝对定位实现业务页面。
   - 使用 Angular 组件化实现。
   - `screenshot.png` 仅作视觉参考。
   - `components.json`、`tokens.json`、`assets-map.json` 是结构化参考。

## 验收

- 导出目录包含 `design-context.md`。
- 内容简洁、可读、适合 AI 使用。
- `agent-prompt.md` 指向 `design-context.md`。
- build / test 通过。

---

# Phase 7：增强 assets-map.json

## 目标

让资源映射可用于 AI 实现页面。

## 范围

```text
packages/design-handoff/sketchplugin/ngm-ai-handoff.sketchplugin/Contents/Sketch/
```

## 任务

1. 识别并导出基础资源：
   - screenshot
   - bitmap
   - slice
   - icon
2. 资源输出到：
   - `assets/images/`
   - `assets/icons/`
   - `assets/slices/`
3. `assets-map.json` 记录：
   - 资源 ID
   - 资源名称
   - 对应 layerId
   - 资源类型
   - 文件路径
   - frame
   - warnings
4. 资源导出失败时写入 warnings，不中断主流程。

## 验收

- `assets-map.json` 不再只是空数组。
- screenshot 正常记录。
- 至少能记录 bitmap 或 slice。
- 资源路径有效。
- build / test 通过。

---

# Phase 8：Hub V2 / ng-manager iframe 联动

## 目标

让页面中的 iframe 与右侧 Handoff 面板完成双向联动。

## 范围

AI Agent 先搜索实际页面位置，关键词：

```text
design handoff
iframe
preview.html
handoff panel
```

可能路径：

```text
apps/hub-v2/web/src/app/
webapp/src/app/
```

## 任务

1. 页面加载 Handoff Package 产物。
2. iframe 加载 `preview.html`。
3. 父页面监听：
   - `ngm-handoff:ready`
   - `ngm-handoff:select`
4. 根据 `handoff-map.json`、`layer-tree.json`、`components.json` 构建 `handoffIndex`。
5. iframe 点击节点后，右侧面板展示对应节点。
6. 右侧面板点击节点后，向 iframe 发送高亮事件。
7. 缺少 `handoff-map.json` 时页面不崩溃，显示兼容提示。

## 验收

- iframe 能显示 `preview.html`。
- 点击 iframe 节点，右侧面板切换。
- 点击右侧节点，iframe 对应节点高亮。
- 控制台无明显错误。
- Angular build 通过。

---

# Phase 9：parser / validator / scanner 支持新包结构

## 目标

让 `packages/design-handoff` 能读取、校验、扫描新的 Handoff Package。

## 范围

```text
packages/design-handoff/src/parser/
packages/design-handoff/src/validators/
packages/design-handoff/src/scanner/
```

## 任务

1. parser 支持读取：
   - `handoff.json`
   - `handoff-map.json`
   - `design-context.md`
   - `preview.html`
   - `interaction-bridge.js`
2. validator 校验推荐文件：
   - 文件存在时校验格式。
   - 文件缺失时给 warning，不直接报错。
3. scanner 增加摘要字段：
   - `hasPreviewHtml`
   - `hasHandoffMap`
   - `hasDesignContext`
4. 保持旧 Handoff Package 可解析。

## 验收

- 旧包不失效。
- 新包可读取新文件。
- validator warning 清晰。
- scanner 能显示新能力状态。
- build / test 通过。

---

# Phase 10：文档、测试、示例包

## 目标

补齐维护文档、测试和示例。

## 范围

```text
packages/design-handoff/README.md
packages/design-handoff/docs/
packages/design-handoff/examples/
packages/design-handoff/scripts/smoke-test.js
```

## 任务

1. 更新 README。
2. 新增文档：
   - `docs/handoff-package-spec.md`
   - `docs/iframe-protocol.md`
   - `docs/agent-usage.md`
   - `docs/plugin-export-workflow.md`
3. 新增最小示例包：
   - `examples/simple-plugin-handoff-package/`
4. 更新 smoke test，覆盖：
   - package 校验
   - handoff-map 读取
   - design-context 读取
   - preview.html 存在
   - 旧包兼容

## 验收

- README 清晰说明插件主链路。
- docs 覆盖 package、iframe、AI 使用方式。
- examples 可用于本地验证。
- smoke test 通过。
- build / test 通过。

---

## 最终验收清单

### 插件导出

- [ ] 能通过自定义 Sketch 插件导出。
- [ ] 包含 `preview.html`。
- [ ] 包含 `interaction-bridge.js`。
- [ ] 包含 `handoff-map.json`。
- [ ] 包含 `design-context.md`。
- [ ] `layer-tree.json` 每个节点有 `handoffId`。
- [ ] `components.json` 每个组件有关联 `layerId`。
- [ ] `assets-map.json` 至少记录 screenshot。
- [ ] `screenshot.png` 正常生成。

### iframe 联动

- [ ] iframe 能加载 `preview.html`。
- [ ] 点击 iframe 节点触发 `ngm-handoff:select`。
- [ ] 右侧面板能根据 `handoffId` 展示节点。
- [ ] 点击右侧节点触发 `ngm-handoff:highlight`。
- [ ] iframe 能高亮并滚动到对应节点。

### AI 上下文

- [ ] `design-context.md` 可读。
- [ ] `agent-prompt.md` 禁止复制 preview DOM。
- [ ] AI 能根据 components / tokens / assets / screenshot 实现页面。
- [ ] 输出页面以 Angular 组件化方式实现。

### 兼容与质量

- [ ] 旧 Handoff Package 不直接失效。
- [ ] validator 能给出清晰 warning。
- [ ] scanner 能显示 package 是否包含新能力。
- [ ] build 通过。
- [ ] smoke test 通过。
- [ ] README 和 docs 已更新。
