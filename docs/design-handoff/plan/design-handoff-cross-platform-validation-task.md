# Design Handoff 插件跨平台验证任务

> 目标：建立 `packages/design-handoff` 自定义 Sketch 插件的验证链路。  
> 执行对象：AI Agent。  
> 开发环境：Windows 11。  
> Sketch 运行环境：macOS，由人工执行。  
> 关键原则：AI Agent 不得伪造 Mac / Sketch 验证结果。

---

## 1. 背景

当前 `packages/design-handoff` 中的自定义 Sketch 插件已经开始支持新的 Handoff Package 产物，包括：

- `preview.html`
- `interaction-bridge.js`
- `handoff.json`
- `layer-tree.json`
- `components.json`
- `handoff-map.json`
- `design-context.md`
- `assets-map.json`
- `screenshot.png`

但当前开发环境主要在 Windows 11 上，而 Sketch 只能在 macOS 上运行。

因此，AI Agent 不能直接完成真实 Sketch 插件安装、真实 Artboard 导出和视觉验收。  
本任务需要建立一套分工清晰的验证流程：

1. Windows 侧由 AI Agent 完成自动验证。
2. Mac 侧由人工完成 Sketch 插件安装与真实导出。
3. Mac 导出的 Handoff Package 回传到 Windows 后，再由 AI Agent 或校验脚本完成结构验证。

---

## 2. 任务目标

AI Agent 需要完成以下工作：

- 建立 Windows 侧可执行的验证流程。
- 增加或完善 Handoff Package 校验能力。
- 新增 Mac 人工验证清单。
- 新增导出包回传后的验证说明。
- 新增验证结果记录文档模板。
- 不伪造 Sketch / macOS 人工验证结果。

---

## 3. 验证链路

标准验证链路如下：

```text
Windows 开发环境
  ↓
AI Agent 执行 build / test / pack:sketch
  ↓
生成 Sketch 插件包
  ↓
人工在 Mac 上安装插件
  ↓
人工在 Sketch 中选择真实 Artboard 导出
  ↓
得到 Handoff Package
  ↓
人工将 Handoff Package 复制回 Windows
  ↓
AI Agent / 脚本校验 Handoff Package
  ↓
记录验证结果
```

---

## 4. 修改范围

主要涉及以下目录：

```text
docs/design-handoff/
packages/design-handoff/package.json
packages/design-handoff/scripts/
packages/design-handoff/src/parser/
packages/design-handoff/src/validators/
packages/design-handoff/src/scanner/
```

如需新增脚本，优先放在：

```text
packages/design-handoff/scripts/
```

不要修改与本任务无关的业务代码。

---

## 5. 需要新增的文档

### 5.1 新增导出验证文档

新增文件：

```text
docs/design-handoff/export-validation.md
```

用途：

记录 Windows 自动验证、Mac 人工验证、回传包验证的结果。

文档中需要明确区分以下状态：

- `已通过`
- `失败`
- `未执行`
- `待 Mac 人工验证`
- `待导出包回传验证`

未实际执行的项目，不能写成“已通过”。

---

### 5.2 新增 Mac 人工验证清单

新增文件：

```text
docs/design-handoff/mac-manual-checklist.md
```

用途：

指导人工在 Mac 上安装 Sketch 插件、执行真实 Artboard 导出、检查导出结果，并将导出包回传到 Windows。

---

## 6. Windows 自动验证任务

AI Agent 需要在 Windows / 当前开发环境中完成以下验证。

### 6.1 执行基础命令

在 `packages/design-handoff` 下执行：

```text
npm run build
npm run test
npm run pack:sketch
```

将结果记录到：

```text
docs/design-handoff/export-validation.md
```

要求：

- 命令通过时，记录通过结果。
- 命令失败时，记录失败原因。
- 如能做最小修复，则只修复阻塞问题。
- 不做无关重构。

---

### 6.2 检查插件打包产物

检查 `pack:sketch` 是否生成可安装的 Sketch 插件包。

需要记录：

- 打包命令
- 输出目录
- 插件包路径
- 是否生成成功
- 如失败，记录失败原因

---

### 6.3 校验工具链能力

检查现有 parser / validator / scanner 是否支持新的 Handoff Package 结构。

重点检查：

- `handoff.json`
- `handoff-map.json`
- `design-context.md`
- `preview.html`
- `interaction-bridge.js`

如果当前工具链还不能校验这些文件，需要做最小增强。

---

## 7. Handoff Package 校验脚本

AI Agent 需要新增或完善一个可在 Windows 执行的校验入口。

建议命令形式：

```text
npm run handoff:validate -- <packageDir>
```

如果项目中已有类似命令，应优先复用现有命令，不重复造轮子。

---

### 7.1 校验内容

校验脚本需要检查：

#### 必需文件

```text
meta.json
layer-tree.json
texts.json
styles.json
tokens.json
components.json
assets-map.json
agent-prompt.md
```

#### 推荐文件

```text
handoff.json
handoff-map.json
design-context.md
preview.html
interaction-bridge.js
screenshot.png
```

推荐文件缺失时给 warning，不直接让旧包失效。

---

### 7.2 JSON 合法性校验

需要校验以下 JSON 文件是否可正常解析：

```text
meta.json
handoff.json
layer-tree.json
texts.json
styles.json
tokens.json
components.json
assets-map.json
handoff-map.json
```

---

### 7.3 Handoff 结构校验

需要校验：

- `layer-tree.json` 根节点是否存在。
- `layer-tree.json` 节点是否包含 `handoffId`。
- `components.json` 是否为数组。
- `components.json` 中组件是否有关联 `layerId`。
- `handoff-map.json` 是否包含 `nodes` 数组。
- `handoff-map.json.nodes` 中是否存在 `handoffId`。
- `preview.html` 是否非空。
- `design-context.md` 是否非空。
- `screenshot.png` 如被引用，文件是否存在。

---

### 7.4 handoffId 贯通校验

如果导出包中存在以下文件：

```text
layer-tree.json
components.json
handoff-map.json
preview.html
```

需要尽量检查：

- `layer-tree.json` 中的 `handoffId` 能在 `handoff-map.json` 中找到。
- `components.json` 中的 `handoffId` 能在 `handoff-map.json` 中找到。
- `preview.html` 中存在 `data-handoff-id`。
- `handoff-map.json` 中的 `domSelector` 不是空值。

如果无法完整校验 DOM selector，也需要输出清晰 warning。

---

## 8. Mac 人工验证清单要求

`docs/design-handoff/mac-manual-checklist.md` 需要包含以下内容。

### 8.1 Mac 环境准备

记录人工需要准备：

- macOS
- Sketch
- ng-manager 自定义 Sketch 插件包
- 一个真实 Sketch 测试文件
- 至少一个真实 Artboard

---

### 8.2 插件安装检查

人工检查：

- 插件是否可以安装到 Sketch。
- Sketch 菜单中是否能看到插件。
- 插件命令是否可执行。
- 插件执行时是否有异常提示。

---

### 8.3 Artboard 导出检查

人工执行：

- 打开真实 Sketch 文件。
- 选择一个真实 Artboard。
- 执行 ng-manager 自定义 Sketch 插件导出。
- 记录导出目录。

导出目录应至少包含：

```text
meta.json
handoff.json
layer-tree.json
texts.json
styles.json
tokens.json
components.json
assets-map.json
handoff-map.json
preview.html
interaction-bridge.js
design-context.md
agent-prompt.md
screenshot.png
```

---

### 8.4 preview.html 人工检查

人工打开 `preview.html`，检查：

- 页面是否能打开。
- screenshot 是否显示。
- 页面尺寸是否合理。
- 是否能看到点击热区。
- hover 是否有反馈。
- 点击节点是否有反应。
- 控制台是否有错误。
- 设计稿是否明显错位。
- 图片资源是否丢失。

---

### 8.5 interaction-bridge.js 人工检查

人工检查：

- 页面加载后是否能发送 `ngm-handoff:ready`。
- 点击节点后是否能发送 `ngm-handoff:select`。
- 手动发送 `ngm-handoff:highlight` 后是否能高亮节点。

如果不方便完整验证 postMessage，也需要在清单中记录“未验证原因”。

---

### 8.6 回传包处理

人工将导出的 Handoff Package 压缩后复制回 Windows。

建议放置路径：

```text
tmp/design-handoff/manual-export/<package-name>/
```

然后在 Windows 上执行校验脚本：

```text
npm run handoff:validate -- tmp/design-handoff/manual-export/<package-name>
```

---

## 9. export-validation.md 内容要求

`docs/design-handoff/export-validation.md` 需要包含以下章节：

1. 验证目标
2. 验证环境
3. Windows 自动验证结果
4. 插件打包结果
5. Mac 人工验证状态
6. Mac 导出包回传状态
7. Handoff Package 校验结果
8. `preview.html` 验证结果
9. `handoffId` 贯通验证结果
10. `design-context.md` 验证结果
11. 已修复问题
12. 遗留问题
13. 下一步建议

---

## 10. 状态记录规则

文档中必须遵守以下规则：

- 未在 Mac 上实际验证的项目，标记为 `待 Mac 人工验证`。
- 未拿到回传导出包的项目，标记为 `待导出包回传验证`。
- 不能写“Sketch 导出已通过”，除非人工已实际执行。
- 不能写“preview.html 已通过”，除非真实导出包已打开检查。
- 失败项必须记录失败原因。
- 无法执行的项必须记录限制条件。

---

## 11. 不要做

本任务不要做：

- 不要假装完成 Mac Sketch 验证。
- 不要写虚假的通过结果。
- 不要接入 Hub V2 页面。
- 不要实现 iframe 右侧面板联动。
- 不要增强 `.sketch` 文件直接解析。
- 不要解析旧 Sketch Measure HTML。
- 不要重写插件导出逻辑。
- 不要新增复杂功能。
- 不要做无关重构。
- 不要引入大依赖。

---

## 12. 验收标准

### 12.1 Windows 自动验证

- `npm run build` 结果已记录。
- `npm run test` 结果已记录。
- `npm run pack:sketch` 结果已记录。
- 失败项有明确原因。
- 可修复的阻塞问题已做最小修复。

---

### 12.2 文档

以下文件已创建：

```text
docs/design-handoff/export-validation.md
docs/design-handoff/mac-manual-checklist.md
```

文档需要满足：

- 明确区分 Windows 自动验证和 Mac 人工验证。
- 未执行项标记为待验证。
- 不伪造通过结果。
- 有清晰的回传包验证流程。

---

### 12.3 校验脚本

Handoff Package 校验脚本需要满足：

- 可以指定 Handoff Package 目录。
- 能检查标准文件是否存在。
- 能检查 JSON 合法性。
- 能检查 `handoff-map.json.nodes`。
- 能检查 `design-context.md` 非空。
- 能检查 `preview.html` 非空。
- 能输出清晰错误和 warning。
- 不破坏旧 Handoff Package 兼容性。

---

### 12.4 Mac 人工验证

AI Agent 不需要完成 Mac 人工验证。

只要求提供：

- 清单
- 步骤
- 状态记录模板
- 回传包校验方式

---

## 13. 推荐提交信息

```text
test(design-handoff): add cross-platform plugin export validation flow
```

---

## 14. 完成后的下一步

当人工在 Mac 上完成真实 Sketch 导出，并将 Handoff Package 复制回 Windows 后，再执行下一阶段任务：

```text
使用 Mac 回传的真实 Handoff Package，运行校验脚本并修复发现的问题。
```

