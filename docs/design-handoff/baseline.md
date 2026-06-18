# Design Handoff 基线文档

> 记录当前 ng-manager 自定义 Sketch 插件的导出能力、现有产物、已知问题和下一步验证项。
> 本文档只描述现状，不涉及改造方案。创建日期：2026-06-17。

## 1. Design Handoff 当前主链路

当前标准链路：

```text
Sketch
  → ng-manager 自定义 Sketch 插件
  → Handoff Package
  → Hub V2 / ng-manager
  → iframe 预览 + Handoff 面板
  → AI Agent 实现 Angular 页面
```

当前标准输入是：自定义 Sketch 插件导出的 Handoff Package。

- UI 设计师使用 ng-manager 自定义 Sketch 插件导出 Handoff Package，不再依赖旧 Sketch Measure 插件。
- Handoff Package 是后续 iframe 预览、Handoff 面板联动、AI Agent 编码的唯一标准输入。
- 本阶段只完成插件导出能力的基线，iframe 右侧面板联动（Phase 8）属于后续阶段，且其落点不在 ng-manager 内。

## 2. 当前插件核心目录

插件核心目录：

```text
packages/design-handoff/sketchplugin/ngm-ai-handoff.sketchplugin/Contents/Sketch/
```

当前核心文件：

- `main.js` — 插件入口，命令注册，版本常量（当前 `PLUGIN_VERSION = 0.2.0`）。
- `exporter.js` — 导出主流程，串联各模块，写入 Handoff Package 全部产物。
- `normalize-layer.js` — 图层归一化，生成 `handoffId / artboardId / parentId / path / absoluteFrame / role / domSelector`。
- `style-extractor.js` — 样式抽取与 Token 汇总，生成 styles / tokens。
- `component-infer.js` — 规则式组件识别（16 类型 + unknown），生成 components。
- `prompt-generator.js` — 生成 `agent-prompt.md`，指向 `design-context.md` 为主入口。
- `settings.js` — 插件设置（导出目录、screenshot 开关）与路径拼接工具。
- `handoff-map-generator.js` — 生成 `handoff-map.json`（DOM 与 Handoff 节点映射）。
- `preview-renderer.js` — 生成 `preview.html`（screenshot 底图 + 命中框覆盖层）。
- `interaction-bridge-template.js` — 生成 `interaction-bridge.js`（iframe 事件桥接）。
- `design-context-generator.js` — 生成 `design-context.md`（AI 编码主上下文）。
- `asset-exporter.js` — 导出 bitmap / slice 图片资源到 `assets/`，写入 `assets-map.json`。

环境约束：插件运行在 Sketch 的 CocoaScript / JSC 上下文，无 Node 的 `fs / path / crypto`，不能 `require` 第三方 npm 包。文件读写使用 `NSString` 与 `NSFileManager`，路径拼接使用 `settings.joinPath`。

## 3. 当前已支持导出文件

当前插件导出目录中应包含：

- `meta.json`
- `handoff.json`
- `layer-tree.json`
- `texts.json`
- `styles.json`
- `tokens.json`
- `components.json`
- `assets-map.json`
- `handoff-map.json`
- `preview.html`
- `interaction-bridge.js`
- `design-context.md`
- `agent-prompt.md`
- `screenshot.png`
- `assets/`

说明：

| 文件 | 作用 |
|---|---|
| `preview.html` | iframe 预览（screenshot 底图 + 命中框） |
| `interaction-bridge.js` | iframe 与父页面通信（ready / select / highlight） |
| `handoff.json` | Handoff 总入口 / manifest |
| `layer-tree.json` | 图层树（含 handoffId / absoluteFrame） |
| `texts.json` | 文本内容 |
| `styles.json` | 样式信息 |
| `tokens.json` | 设计 Token（颜色 / 字号 / 圆角） |
| `components.json` | 组件识别结果 + 实现建议 |
| `assets-map.json` | 资源映射 + warnings |
| `handoff-map.json` | DOM 与 Handoff 节点映射 |
| `design-context.md` | AI 编码主上下文 |
| `agent-prompt.md` | Agent 任务提示 |
| `screenshot.png` | 视觉对照 |

## 4. 当前已具备能力

插件导出侧已具备以下能力（基线状态）：

- 支持 Artboard 导出。
- 支持 screenshot 导出（可在设置中开关）。
- 支持 `layer-tree.json`，每个节点有稳定 `handoffId`、`absoluteFrame`、`artboardId`、`parentId`、`path`、`role`、`domSelector`。
- 支持 `styles.json` 与 `tokens.json`（颜色 / 字号 / 圆角）。
- 支持 `components.json`：规则式识别 16 类型 + unknown，组件关联 `layerId / handoffId / domSelector / implementationHint`，不确定时归 unknown 不丢弃节点。
- 支持 `handoff-map.json`：layer 与 component 节点映射，可通过 `handoffId` 定位。
- 支持 `preview.html`：screenshot 底图 + 命中框覆盖层，节点带 `data-handoff-id`。
- 支持 `interaction-bridge.js`：`ngm-handoff:ready / select / highlight` 事件协议。
- 支持 `design-context.md`：AI 编码主上下文（页面结构 / 组件清单 / Tokens / 资源 / Angular 建议 / 约束）。
- 支持 `handoff.json`：Handoff Package manifest 总入口。
- lib 侧 parser / validator / scanner 已开始支持新包结构：parser 可读取 handoff.json / handoff-map.json / design-context.md / preview.html / interaction-bridge.js；validator 对缺失推荐文件给 warning 不报错；scanner 增加了 `hasPreviewHtml / hasHandoffMap / hasDesignContext` 摘要字段。

## 5. 当前已知问题

> `npm run build`、`npm run test`、`npm run pack:sketch` 实际执行结果见第 6 节。

- `preview.html` 当前是 screenshot + hit box（命中框覆盖层），不是完整旧 Sketch Measure 的 DOM 化逐层预览；视觉还原度有限。
- `texts.json` 还缺 `handoffId / artboardId / absoluteFrame / domSelector`，尚未与 layer-tree / handoff-map 贯通。
- `assets-map.json` 的 bitmap / slice 资源导出目前只覆盖 Image / Bitmap / Slice 三类，需要真实 Sketch 文件验证；icon / sprite 尚未支持。
- validator 目前只对推荐文件做"存在性"判断，还需要增强 `handoff-map.json` / `preview.html` / `design-context.md` 的结构校验。
- lib 侧 `createHandoffAgentTask` 的 `sourceFiles` 清单仍是旧的 8 文件，未纳入 handoff.json / handoff-map.json / design-context.md / preview.html / interaction-bridge.js（不影响插件导出，仅影响 agent task 产物）。
- iframe 右侧面板联动（Phase 8）尚未实现，且其落点不在 ng-manager 内，本基线不包含。

## 6. 下一步验证项

### 6.1 命令实际执行结果（截至 2026-06-17）

在 `packages/design-handoff` 下执行：

| 命令 | 结果 | 说明 |
|---|---|---|
| `npm run build` | ✅ 通过 | `tsc -p tsconfig.json`，无错误，输出 `lib/`。 |
| `npm run test` | ✅ 通过 | 等价 `npm run build && node scripts/smoke-test.js`。输出：`Testing .sketch file parsing...` → `Sketch file parsing test passed` → `design-handoff smoke test passed`。 |
| `npm run pack:sketch` | ✅ 通过 | `Packed 13 files`，产物 `.artifacts/sketch/ngm-ai-handoff.sketchplugin.zip`。 |

### 6.2 仍需验证

- 使用真实 Sketch 画板导出一次（插件端到端，macOS 环境）。
- 检查导出目录是否完整（应包含全部 13 项产物 + screenshot.png + assets/）。
- 打开 `preview.html` 验证展示是否可用。
- 点击节点验证 `ngm-handoff:select` 是否发出。
- 验证 `ngm-handoff:highlight` 是否能高亮并滚动到对应节点。
- 检查 `handoffId` 是否能贯通 `layer-tree.json` / `components.json` / `handoff-map.json`。

