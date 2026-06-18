# Mac 人工验证清单 — Design Handoff Sketch 插件

> 用途：指导人工在 macOS + Sketch 上安装 ng-manager 自定义 Sketch 插件、执行真实 Artboard 导出、检查导出结果，并将导出包回传到 Windows 做结构校验。
> 执行方：人工（macOS 环境）。AI Agent 不得伪造本清单的任何结果。
> 关联文档：`docs/design-handoff/export-validation.md`、`docs/design-handoff/baseline.md`。

## 0. 状态记录模板

每完成一步，把 `[ ]` 改成 `[x]` 并在 `结果` 列填写实际观察。状态取值：`已通过` / `失败`（附原因）/ `未执行`。

| 章节 | 项 | 状态 | 结果/备注 |
|---|---|---|---|
| 1 环境准备 | macOS | 未执行 | |
| 1 环境准备 | Sketch | 未执行 | |
| 1 环境准备 | 插件包 | 未执行 | |
| 1 环境准备 | 测试文件/Artboard | 未执行 | |
| 2 插件安装 | 可安装 | 未执行 | |
| 2 插件安装 | 菜单可见 | 未执行 | |
| 2 插件安装 | 命令可执行 | 未执行 | |
| 2 插件安装 | 无异常提示 | 未执行 | |
| 3 Artboard 导出 | 导出成功 | 未执行 | |
| 3 Artboard 导出 | 导出目录完整 | 未执行 | |
| 4 preview.html | 可打开 | 未执行 | |
| 4 preview.html | screenshot 显示 | 未执行 | |
| 4 preview.html | 热区/点击/hover | 未执行 | |
| 4 preview.html | 控制台无错误 | 未执行 | |
| 5 interaction-bridge | ngm-handoff:ready | 未执行 | |
| 5 interaction-bridge | ngm-handoff:select | 未执行 | |
| 5 interaction-bridge | ngm-handoff:highlight | 未执行 | |
| 6 回传包 | 已压缩回传 | 未执行 | |
| 6 回传包 | Windows 校验脚本通过 | 未执行 | |

---

## 1. Mac 环境准备

人工需准备：

- macOS（任一受支持版本）。
- Sketch（建议 Sketch 90+；记录实际版本）。
- ng-manager 自定义 Sketch 插件包：`D:\ng-manager\.artifacts\sketch\ngm-ai-handoff.sketchplugin.zip`（由 Windows 侧 `npm run pack:sketch` 生成，需先在 Windows 生成并复制到 Mac）。
- 一个真实 Sketch 测试文件（建议使用项目实际设计稿，如 `.sketch`）。
- 至少一个真实 Artboard（含文本、形状、图片，便于验证 components/assets 导出）。

> 从 Windows 复制 zip 到 Mac 后，双击解压得到 `ngm-ai-handoff.sketchplugin`。

---

## 2. 插件安装检查

人工操作：

1. 双击 `ngm-ai-handoff.sketchplugin` 安装到 Sketch。
2. 打开 Sketch → 菜单栏 Plugins（插件）→ 查找 "NGM AI Handoff"。
3. 记录检查结果：

- 插件是否可以安装到 Sketch：`未执行` / `已通过` / `失败：原因`
- Sketch 菜单中是否能看到插件：`未执行`
- 插件命令是否可执行（Export Selected Artboard / Export Current Page / Settings）：`未执行`
- 插件执行时是否有异常提示：`未执行`（若有，截图并记录提示文本）

> 如安装或执行报错，记录完整错误文本，回传后由 AI Agent 排查。

---

## 3. Artboard 导出检查

人工执行：

1. 打开真实 Sketch 文件。
2. 选择一个真实 Artboard。
3. 执行 NGM AI Handoff → Export Selected Artboard。
4. 记录导出目录路径（默认 `~/Desktop/ngm-ai-handoff/<文档名>/<画板名>`，可在 Settings 中修改）。

导出目录应至少包含（逐项核对是否存在）：

- [ ] `meta.json`
- [ ] `handoff.json`
- [ ] `layer-tree.json`
- [ ] `texts.json`
- [ ] `styles.json`
- [ ] `tokens.json`
- [ ] `components.json`
- [ ] `assets-map.json`
- [ ] `handoff-map.json`
- [ ] `preview.html`
- [ ] `interaction-bridge.js`
- [ ] `design-context.md`
- [ ] `agent-prompt.md`
- [ ] `screenshot.png`
- [ ] `assets/` 目录（如有图片图层）

> 如某文件缺失，记录缺失文件名；如导出直接报错，记录错误文本。

---

## 4. preview.html 人工检查

人工用浏览器直接打开导出目录中的 `preview.html`，检查：

- 页面是否能打开：`未执行`
- screenshot 是否显示：`未执行`
- 页面尺寸是否合理（与画板尺寸一致）：`未执行`
- 是否能看到点击热区（命中框）：`未执行`
- hover 是否有反馈（虚线描边）：`未执行`
- 点击节点是否有反应（无报错）：`未执行`
- 浏览器控制台是否有错误（F12 查看）：`未执行`（如有，截图/记录）
- 设计稿是否明显错位：`未执行`
- 图片资源是否丢失：`未执行`

> 直接打开（file://）时 `interaction-bridge.js` 的 `postMessage` 会指向 `window.parent`，若不在 iframe 中，仅 `ngm-handoff:ready` 会发出但父页无接收，属正常现象；控制台不应出现脚本加载失败。

---

## 5. interaction-bridge.js 人工检查

人工检查（建议在 iframe 宿主页或 DevTools 控制台观察 postMessage）：

- 页面加载后是否能发送 `ngm-handoff:ready`：`未执行`
- 点击节点后是否能发送 `ngm-handoff:select`（payload 含 handoffId/layerId）：`未执行`
- 手动发送 `ngm-handoff:highlight`（在 iframe 内执行 `window.postMessage({type:'ngm-handoff:highlight',handoffId:'<某节点>'},'*')`）后是否能高亮并滚动到对应节点：`未执行`

> 验证 `select` 事件可在宿主页监听 `message` 事件，或直接在浏览器 DevTools Console 执行：
> `window.addEventListener('message', e => console.log(e.data))` 后点击节点观察输出。

如不方便完整验证 postMessage（例如尚未接入 iframe 宿主页），需在本清单记录“未验证原因”。

---

## 6. 回传包处理

人工将导出的 Handoff Package 压缩后复制回 Windows：

1. 在 Mac 上压缩整个导出目录（含 `preview.html`、`screenshot.png`、`assets/` 等）。
2. 复制到 Windows 项目目录，建议放置路径：

```text
tmp/design-handoff/manual-export/<package-name>/
```

3. 在 Windows 上执行校验脚本（二选一）：

```text
# 方式一：workspace 命令
npm run handoff:validate -w @yinuo-ngm/design-handoff -- tmp/design-handoff/manual-export/<package-name>

# 方式二：直接 node（在 packages/design-handoff 下）
node scripts/validate-handoff.js <packageDir 绝对路径>
```

4. 把脚本输出（`ok`、`checks` 明细、`warnings`）粘贴到 `docs/design-handoff/export-validation.md` 的「Mac 导出包回传状态」「Handoff Package 校验结果」章节。

> 校验脚本不会修改 Handoff Package，只读校验。`ok: true` 即结构通过；warning 表示推荐项缺失或结构建议，不阻断。

---

## 附：常见失败排查指引

- **插件安装失败**：确认 Sketch 版本；确认 zip 解压后是 `.sketchplugin` 包（含 Contents/Sketch/*.js）。
- **导出报错 "no exportable layers"**：所选 Artboard 无可见图层，换一个含内容的 Artboard。
- **preview.html 空白**：检查 `screenshot.png` 是否生成；检查 `assets-map.json` 的 screenshot 字段。
- **handoffId 贯通 warning**：检查 `layer-tree.json` / `components.json` / `handoff-map.json` 的 handoffId 是否一致，回传后交 AI Agent 排查。
