# ngm-ai-handoff Sketch 插件能力审计（Phase 0 基线）

> 用途：在增强自定义 Sketch 插件导出能力之前，固定当前插件与工具链的现状基线，明确可复用模块与待补齐能力。
> 生成依据：逐行阅读 `sketchplugin/.../Contents/Sketch/*.js`、`src/schema/`、`src/parser/`、`src/validators/`、`src/scanner/` 以及 `scripts/smoke-test.js` 后记录。
> 日期：2026-06-17

## 1. 基线命令状态

在 `D:\ng-manager\packages\design-handoff` 下实测：

| 命令 | 状态 | 说明 |
|---|---|---|
| `npm run build` (`tsc -p tsconfig.json`) | ✅ 通过 | 输出 `lib/`。基线期间发现 `src/sketch-file/unzip.ts` 曾因 `jszip` 未安装而编译失败（`package.json` 已声明、但 `node_modules` 缺失），补装后恢复。 |
| `npm run test` | ✅ 通过 | 等价 `npm run build && node scripts/smoke-test.js`。smoke test 覆盖：旧标准包校验/解析、`.sketch` 文件直解、agent task 生成。 |
| `node scripts/pack-sketch-plugin.js` | ✅ 通过 | 打包 8 个文件到 `.artifacts/sketch/ngm-ai-handoff.sketchplugin.zip`。 |
| `PLUGIN_VERSION` | `0.1.0` | 定义于 `main.js`。 |

> 注意：`package.json` 脚本名为 `pack:sketch`。统一用 `npm run pack:sketch -w @yinuo-ngm/design-handoff`。

## 2. 插件当前导出链路

入口 `main.js`：
- `onExportSelectedArtboard` / `onExportCurrentPage` → 选取 Artboard → `exporter.exportArtboard(document, artboard, { pluginVersion, settings })`。
- `onOpenSettings` → `settings.configureSettings()`（NSAlert 选导出目录、开关 screenshot）。

`exporter.js` 的 `exportArtboard` 当前产出 8 个文件 + 1 张图：

| 产物 | 生成方式 | 现状字段 |
|---|---|---|
| `meta.json` | `buildMeta`（硬编码 `platform:"sketch"`，版本来自入参 `0.1.0`） | pluginVersion / documentName / documentPath / pageName / artboardName / exportedAt / platform |
| `layer-tree.json` | `normalize.normalizeLayer(artboard, styleRegistry)` | id / name / type / frame / hidden / locked / text / styleRef / children |
| `texts.json` | `normalize.collectTexts(artboard)` | id / name / text / fontFamily / fontSize / fontWeight / color / frame |
| `styles.json` | `style-extractor.createStyleRegistry().styles` | style_xxx -> fills/borders/radius/opacity/shadows/fontFamily?/fontSize?/fontWeight? |
| `tokens.json` | `style-extractor.extractTokens(styleMap, texts)` | colors / fontSize / radius（三张 map） |
| `components.json` | `component-infer.inferComponents(layerTree)` | id / name / inferredType / confidence / frame / text（类型仅 6 种，无 layer 关联） |
| `assets-map.json` | 内联对象 | `{ screenshot, assets:[], warnings:[] }` |
| `agent-prompt.md` | `prompt-generator.generatePrompt(meta, assetsMap)` | 固定文案 + 输入文件清单 |
| `screenshot.png` | `exportScreenshot`（`sketch.export(artboard,{formats:"png"})`） | 仅整画板截图，文件名归一为 `screenshot.png` |

环境约束（重要）：插件运行在 Sketch 的 CocoaScript/JSC 上下文，没有 Node 的 `fs`/`path`/`crypto`，不能 `require` 第三方 npm 包。文件读写只能用 `NSString.writeToFile:atomically:encoding:error` 与 `NSFileManager`，路径拼接用自实现的 `settings.joinPath`（已有）。

## 3. 对照 phase0.md 目标目录的缺口

phase0.md 要求导出目录至少包含 13 项，当前缺 5 项 / 弱 4 项：

| 目标产物 | 现状 | 缺口 |
|---|---|---|
| `preview.html` | ❌ 未生成 | 需新增 `preview-renderer.js` |
| `interaction-bridge.js` | ❌ 未生成 | 需新增 `interaction-bridge-template.js` |
| `handoff-map.json` | ❌ 未生成 | 需新增 `handoff-map-generator.js` |
| `design-context.md` | ❌ 未生成 | 需新增 `design-context-generator.js` |
| `assets/` | ❌ 未生成 | assets 数组固定为空，需新增 `asset-exporter.js` |
| `layer-tree.json` | ⚠️ 字段不足 | 缺 handoffId / artboardId / parentId / path / absoluteFrame / role / domSelector |
| `components.json` | ⚠️ 字段不足 | 缺 layerId / handoffId / artboardId / absoluteFrame / textList / layerIds / domSelector / implementationHint；类型仅 6 种 |
| `assets-map.json` | ⚠️ 内容空 | 仅 screenshot；缺 bitmap / slice / 基础图片资源 |
| `meta.json` | ⚠️ 无版本标识 | 无 handoffSpecVersion，且 pluginVersion 仍 0.1.0（待升 0.2.0） |

## 4. 当前可复用模块

| 模块 | 复用判定 |
|---|---|
| `settings.js` | ✅ 直接复用：`getSettings` / `configureSettings` / `joinPath`。后续新增 `preview.html` 等写入沿用 `joinPath`。 |
| `style-extractor.js` | ✅ 直接复用：`createStyleRegistry` / `extractStyle` / `extractTokens`，无需改。 |
| `normalize-layer.js` | 🔧 需增强：`normalizeLayer` 增 ctx 参数以计算 handoffId/artboardId/parentId/path/absoluteFrame；`collectTexts` 同步带 handoffId。frame 计算已有可直接复用。 |
| `component-infer.js` | 🔧 需增强：RULES 扩到 17 类型；`inferComponents` 输出完整字段 + implementationHint。 |
| `exporter.js` | 🔧 需增强：在现有 8 文件写入后追加 5 个新产物；升级 pluginVersion；`buildMeta` 加 handoffSpecVersion。 |
| `prompt-generator.js` | 🔧 需增强：更新为指向 `design-context.md` 为优先入口，保留 "Angular + NG-ZORRO" 约束。 |
| `main.js` | 🔧 仅升 `PLUGIN_VERSION` 常量。 |

lib 侧（`src/`）现状无需为插件增强而改；后段让 parser/validator/scanner 识别新文件时，新增 schema 字段全部用可选类型，保证旧 `.sketch` 直解路径（`src/sketch-file/*`）与 smoke test 不破。

## 5. 需新增模块（计划）

| 新模块 | 职责 | 实现要点（Sketch 环境约束） |
|---|---|---|
| `preview-renderer.js` | 生成 `preview.html` | 纯 ES5 字符串拼接（不可用模板引擎 npm）。模型：`<img src="screenshot.png">` 底图 + 按 `absoluteFrame` 绝对定位的命中框覆盖层，每框带 `data-handoff-id/layer-id/artboard-id/handoff-type/handoff-name` + 内联高亮 CSS + `<script src="interaction-bridge.js">`。 |
| `interaction-bridge-template.js` | 生成 `interaction-bridge.js` 内容 | 导出固定字符串：`ngm-handoff:ready/select/highlight` 事件协议，source=`ngm-preview`，对照方案 §8.4。 |
| `handoff-map-generator.js` | 生成 `handoff-map.json` | 遍历 layerTree + components 生成 `nodes`，每个 node 带 handoffId/layerId/componentId?/artboardId/type/name/domSelector/frame。 |
| `design-context-generator.js` | 生成 `design-context.md` | 按方案 §11.2 结构纯字符串拼接：基本信息/页面结构/组件清单/文本摘要/Tokens/资源说明/Angular 建议/约束/已知问题。 |
| `asset-exporter.js` | 增强 `assets-map.json` + 写 `assets/` | 在 screenshot 之外，对图片类图层 `sketch.export(layer,{formats:"png"})` 到 `assets/images/`；失败 push warning 不中断。 |

## 6. 旧 Sketch Measure 基础能力对照

phase0.md 要求“至少具备旧 Sketch Measure 的基础 handoff 能力”。对照核心能力：

| 旧 Sketch Measure 能力 | 当前插件 | 增强后预期 |
|---|---|---|
| 画板导出 | ✅ 已有 | 保留 |
| HTML 预览 | ❌ | `preview.html`（screenshot 底图 + 命中框，第一版不追求视觉还原度） |
| 图层查看 | ⚠️ 仅 JSON 树 | `layer-tree.json` 带 handoffId 等定位字段；preview.html 命中框可点选 |
| 文本查看 | ✅ texts.json | 保留并带 handoffId |
| 样式查看 | ✅ styles.json | 保留 |
| 颜色/字号/间距查看 | ⚠️ 颜色/字号/圆角有，间距无 | tokens 第一版保留现有三类，间距待后续 |
| 图片/切图资源导出 | ❌ 仅 screenshot | `assets/images/` bitmap；slice 待后续 |
| 开发人员静态交付页 | ❌ | preview.html 即承担，可独立打开 |

明确不照搬旧 Sketch Measure 实现，吸收能力后用上述新模块重新实现。

## 7. Phase 0 结论

- 基线命令（build / test / pack）均通过。
- 现有 8 个产物 + 7 个插件模块审计完成，可复用/需增强/需新增已列清。
- 阻塞前提已解决：`jszip` 依赖就位，`unzip.ts` 编译恢复。
- 后续按 phase0.md Step 2–10 推进，全部新增产物字段以可选方式扩展 schema，保证旧包与 `.sketch` 直解路径不破。
