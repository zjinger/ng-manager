# Design Handoff 插件导出验证记录

> 本文档记录 Design Handoff 自定义 Sketch 插件的跨平台验证结果。
> 执行环境：Windows 11（AI Agent 自动验证）+ macOS/Sketch（人工验证，待执行）。
> 核心原则：未在 Mac/Sketch 实际执行的项目标记为 `待 Mac 人工验证`；未拿到回传导出包的项目标记为 `待导出包回传验证`；不伪造通过结果。
> 关联清单：`docs/design-handoff/mac-manual-checklist.md`。

## 1. 验证目标

验证 `packages/design-handoff` 自定义 Sketch 插件具备标准 Handoff Package 导出能力，覆盖：

- Windows 侧 build / test / pack:sketch 自动验证。
- 插件包可安装性（打包产物完整性）。
- 工具链（parser / validator / scanner）对新包结构的校验能力。
- Mac 侧真实 Sketch 导出（人工）。
- 回传包结构校验（handoffId 贯通 / preview / design-context 等）。

## 2. 验证环境

| 项 | 值 |
|---|---|
| Windows 开发环境 | Windows 11 |
| AI Agent 验证侧 | 本仓库 PowerShell + Node v20 |
| Sketch 运行环境 | macOS（由人工执行，尚未执行） |
| 包版本 | `@yinuo-ngm/design-handoff@0.2.0` |
| 插件版本 | `PLUGIN_VERSION = 0.2.0` |

## 3. Windows 自动验证结果

在 `packages/design-handoff` 下执行基础命令（2026-06-17 实测）：

| 命令 | 状态 | 说明 |
|---|---|---|
| `npm run build` | 已通过 | `tsc -p tsconfig.json`，无错误，输出 `lib/`。 |
| `npm run test` | 已通过 | `npm run build && node scripts/smoke-test.js`。输出 `Sketch file parsing test passed` + `design-handoff smoke test passed`。 |
| `npm run pack:sketch` | 已通过 | `Packed 13 files`，产物 `.artifacts/sketch/ngm-ai-handoff.sketchplugin.zip`。 |

无失败项，无需最小修复。

## 4. 插件打包结果

- 打包命令：`npm run pack:sketch -w @yinuo-ngm/design-handoff`
- 输出目录：`D:\ng-manager\.artifacts\sketch\`
- 插件包路径：`D:\ng-manager\.artifacts\sketch\ngm-ai-handoff.sketchplugin.zip`
- 是否生成成功：是（`Packed 13 files`）
- 打包脚本：`scripts/pack-sketch-plugin.js`（自实现 ZIP，无外部依赖）
- 插件内容：`sketchplugin/ngm-ai-handoff.sketchplugin/Contents/Sketch/` 下 12 个 JS 模块

> `pack:sketch` 仅打包文件，不验证插件在 Sketch 中的实际安装/运行，后者需 Mac 人工验证。

## 5. Mac 人工验证状态

> 状态：待 Mac 人工验证（AI Agent 未在 Mac/Sketch 执行任何步骤）。

- Sketch 插件安装：`待 Mac 人工验证`
- 插件命令执行（Export Selected Artboard）：`待 Mac 人工验证`
- 真实 Artboard 导出：`待 Mac 人工验证`
- 导出目录完整性检查：`待 Mac 人工验证`

详见 `docs/design-handoff/mac-manual-checklist.md`。

## 6. Mac 导出包回传状态

> 状态：待导出包回传验证（尚未拿到 Mac 真实导出的 Handoff Package）。

- 是否已拿到回传导出包：否
- 回传包路径（待填）：`tmp/design-handoff/manual-export/<package-name>/`
- 回传包校验脚本输出：待执行 `npm run handoff:validate -- <packageDir>` 后填写
## 7. Handoff Package 校验结果

> 新增校验脚本 `scripts/validate-handoff.js` + lib 详细校验 `validateHandoffPackageDetailed`，覆盖 §7.1-7.4。命令：`npm run handoff:validate -w @yinuo-ngm/design-handoff -- <packageDir>`。

### 7.1 校验能力覆盖

| 校验项 | 类别 | 级别 | 实现 |
|---|---|---|---|
| 必需文件存在（meta/layer-tree/texts/styles/tokens/components/assets-map/agent-prompt.md） | §7.1 | error | 已实现 |
| 推荐文件缺失（handoff.json/handoff-map.json/design-context.md/preview.html/interaction-bridge.js/screenshot.png） | §7.1 | warning | 已实现 |
| 必需 JSON 合法性 | §7.2 | error | 已实现（复用基础 validator） |
| 推荐 JSON 合法性（handoff.json/handoff-map.json） | §7.2 | warning（已存在时） | 已实现 |
| layer-tree 根节点 / 节点 handoffId | §7.3 | error / warning | 已实现 |
| components 数组 / layerId / handoffId | §7.3 | error / warning | 已实现 |
| handoff-map.nodes 数组 / 节点 handoffId / domSelector 非空 | §7.3 | warning | 已实现 |
| preview.html 非空 | §7.3 | warning | 已实现 |
| design-context.md 非空 | §7.3 | warning | 已实现 |
| screenshot 引用存在 | §7.3 | warning | 已实现 |
| layer-tree handoffId ⊆ handoff-map handoffId | §7.4 | warning | 已实现 |
| components handoffId ⊆ handoff-map handoffId | §7.4 | warning | 已实现 |
| preview.html 含 data-handoff-id | §7.4 | warning | 已实现 |

### 7.2 Windows 侧 fixture 实测（2026-06-17）

用临时脚本构造两个 fixture 验证（不依赖真实 Sketch），结果：

- **新风格完整包**（含全部推荐文件 + handoffId 贯通）：`ok: true`，30 项校验全 PASS，0 error / 0 warning / 0 skip。
- **旧式包**（仅必需文件，无推荐文件，layer-tree 无 handoffId）：`ok: true`（不破坏兼容），12 PASS / 8 warning（推荐文件缺失等）/ 5 skip（preview/handoff-map/design-context 不存在跳过）。`errors: 0`。
- **CLI 实测**：`node scripts/validate-handoff.js <fullPackageDir>` 输出 `ok: true`，`checks: 30 (pass=30, error=0, warning=0, skip=0)`。

结论：校验脚本满足 §12.3 验收——可指定目录、检查标准文件、JSON 合法性、handoff-map.nodes、preview/design-context 非空、输出清晰 error/warning、不破坏旧包兼容性（旧包 ok=true）。

### 7.3 Mac 真实导出包校验结果

> 状态：待导出包回传验证。Mac 真实导出包回传后，执行 `npm run handoff:validate -- <packageDir>` 并在此粘贴输出。

## 8. preview.html 验证结果

- **Windows 侧（fixture）**：构造的 preview.html 含 `data-handoff-id`，校验 `structure:preview-nonempty` 与 `consistency:preview-data-handoff-id` 均 PASS。
- **浏览器实际打开展示**：`待 Mac 人工验证`（真实导出包回传后人工打开检查 screenshot 显示/热区/hover/点击）。

> 直接 file:// 打开 preview.html 仅验证渲染，不验证与宿主页 iframe 联动。

## 9. handoffId 贯通验证结果

- **Windows 侧（fixture）**：完整包三项贯通校验全 PASS（`consistency:layer-to-map` / `consistency:component-to-map` / `consistency:preview-data-handoff-id`）。
- **真实导出包贯通校验**：`待导出包回传验证`（回传后由 `handoff:validate` 自动校验 layer-tree/components/handoff-map/preview 的 handoffId 一致性）。

## 10. design-context.md 验证结果

- **Windows 侧（fixture）**：校验 `structure:design-context-nonempty` PASS。
- **真实导出包内容可读性**：`待导出包回传验证`（回传后人工确认包含页面结构/组件清单/Tokens/Angular 建议/约束）。

## 11. 已修复问题

本任务为新建验证链路，未触发代码阻塞问题，无需最小修复：

- Windows 侧 `build` / `test` / `pack:sketch` 均一次通过，无失败项。
- 新增 `validateHandoffPackageDetailed` 详细校验模块期间，发现并修复了一个自身实现 bug：handoff-map.json 的 nodes 遍历逻辑（收集 `mapHandoffIds`、校验 node handoffId/domSelector）在拆分编辑时遗漏，导致 §7.4 贯通校验对完整包误报。已补回遍历逻辑，完整包 30 项校验全 PASS。

本任务未修改插件导出逻辑、未增强 `.sketch` parser、未接入 Hub V2（符合"不要做"清单）。

## 12. 遗留问题

- **Mac 人工验证未执行**：插件真实安装/导出/preview 实际展示，均待人工在 macOS + Sketch 完成。本任务不伪造结果。
- **回传包校验待执行**：尚未拿到 Mac 真实导出的 Handoff Package，§7.3/§9/§10 的真实包部分均标待验证。
- **校验脚本为只读**：`handoff:validate` 不修改包内容，仅输出 error/warning；真实包如存在 handoffId 不贯通等 warning，需单独排查插件导出逻辑。
- **screenshot.png 校验仅存在性**：不校验图片是否真实可渲染（需人工打开 preview.html 时确认）。
- **基础 validator 未变严格**：为不破坏旧包/`.sketch` 包兼容，§7.3 结构问题（handoffId 缺失等）归 warning，旧包仍 `ok=true`。若未来要求旧包也需 handoffId，需单独评估。

## 13. 下一步建议

1. 人工在 Mac 完成 `mac-manual-checklist.md` 全流程，将导出包回传到 `tmp/design-handoff/manual-export/<package-name>/`。
2. 回传后在 Windows 执行 `npm run handoff:validate -w @yinuo-ngm/design-handoff -- tmp/design-handoff/manual-export/<package-name>`，把输出粘贴到本文档 §7.3 / §8 / §9 / §10。
3. 如真实包出现 warning（例如 handoffId 不贯通、preview 无 data-handoff-id），定位插件侧对应生成逻辑（`normalize-layer.js` / `handoff-map-generator.js` / `preview-renderer.js`）并修复，再重新导出验证。
4. 回传包验证通过后，进入任务文档 §14「下一步」：使用 Mac 回传的真实 Handoff Package 修复发现的问题。

