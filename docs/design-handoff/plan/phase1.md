# Phase 1：真实 Handoff Package 回传校验与最小修复

> 目标：使用 Mac 上真实 Sketch 插件导出的 Handoff Package，完成 Windows 侧结构校验、问题定位和最小修复。  
> 执行对象：AI Agent。  
> 前提：Mac 人工已完成 Sketch 插件导出，并将导出包复制回 Windows。  
> 原则：只修复真实导出包暴露出的阻塞问题，不扩展新功能。

---

## 1. 背景

当前 `packages/design-handoff` 已经具备自定义 Sketch 插件导出能力，并规划了跨平台验证流程。

由于开发环境是 Windows 11，而 Sketch 只能在 macOS 上运行，真实导出需要人工在 Mac 上完成。

人工导出完成后，会将 Handoff Package 复制回 Windows。  
本阶段任务就是让 AI Agent 基于这个真实导出包完成校验和最小修复。

---

## 2. 输入条件

开始本阶段前，应具备以下输入：

- Mac 上已安装 ng-manager 自定义 Sketch 插件。
- Mac 上已使用真实 Sketch Artboard 导出 Handoff Package。
- 导出目录已复制回 Windows。
- 回传目录建议放在：

```text
tmp/design-handoff/manual-export/<package-name>/
```

如果没有真实回传包，不允许假装验证通过。

---

## 3. 本阶段目标

完成以下工作：

1. 使用真实 Handoff Package 运行校验脚本。
2. 检查导出文件结构是否完整。
3. 检查 JSON 文件是否合法。
4. 检查 `handoffId` 是否贯通。
5. 检查 `preview.html` 是否可读、非空、具备交互数据属性。
6. 检查 `design-context.md` 是否可作为 AI 编码上下文。
7. 定位真实导出中的问题。
8. 对阻塞问题做最小修复。
9. 将验证结果写入文档。

---

## 4. 主要修改范围

优先涉及：

```text
packages/design-handoff/src/parser/
packages/design-handoff/src/validators/
packages/design-handoff/src/scanner/
packages/design-handoff/scripts/
docs/design-handoff/
```

如果问题来自插件导出逻辑，可以最小修改：

```text
packages/design-handoff/sketchplugin/ngm-ai-handoff.sketchplugin/Contents/Sketch/
```

不要做无关重构。

---

## 5. 执行步骤

### 5.1 确认回传包路径

确认真实导出包路径，例如：

```text
tmp/design-handoff/manual-export/<package-name>/
```

检查该目录是否存在。

如果目录不存在，需要停止任务，并在文档中记录：

```text
未发现 Mac 回传的真实 Handoff Package，无法执行 Phase 1 验证。
```

---

### 5.2 运行 Handoff Package 校验

执行项目中已有或新增的校验命令，例如：

```text
npm run handoff:validate -- tmp/design-handoff/manual-export/<package-name>
```

如果命令不存在，需要优先补齐一个最小可用校验入口。

校验结果需要记录到：

```text
docs/design-handoff/phase1-validation.md
```

---

### 5.3 检查文件结构

真实导出包至少应包含：

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

检查结果记录到 `docs/design-handoff/phase1-validation.md`。

---

### 5.4 检查 JSON 合法性

检查以下 JSON 文件是否可正常解析：

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

如发现 JSON 解析失败，需要定位是导出逻辑问题还是校验逻辑问题，并做最小修复。

---

### 5.5 检查 handoffId 贯通

重点检查：

- `layer-tree.json` 中是否存在 `handoffId`
- `components.json` 中是否存在 `handoffId`
- `handoff-map.json.nodes` 中是否存在 `handoffId`
- `preview.html` 中是否存在 `data-handoff-id`
- `handoff-map.json` 中的 `domSelector` 是否可用于定位节点

校验目标：

```text
layer-tree.json
  ↔ components.json
  ↔ handoff-map.json
  ↔ preview.html
```

如果发现 `handoffId` 不一致，需要优先修复导出生成逻辑。

---

### 5.6 检查 preview.html

检查：

- 文件是否存在
- 文件是否非空
- 是否引用 `interaction-bridge.js`
- 是否包含 `data-handoff-id`
- 是否包含 `data-layer-id`
- 是否包含 `data-artboard-id`
- 是否包含 `data-handoff-type`
- 是否能引用 `screenshot.png`

如果可以在浏览器打开，则记录人工或本地打开结果。

如果 AI Agent 无法进行视觉检查，只记录静态结构检查，不写“视觉已通过”。

---

### 5.7 检查 interaction-bridge.js

检查：

- 是否存在
- 是否非空
- 是否包含 `ngm-handoff:ready`
- 是否包含 `ngm-handoff:select`
- 是否包含 `ngm-handoff:highlight`
- 是否监听点击事件
- 是否能响应 highlight 消息

只做静态检查，不伪造浏览器运行结果。

---

### 5.8 检查 design-context.md

检查：

- 文件是否存在
- 文件是否非空
- 是否包含页面基本信息
- 是否包含页面结构摘要
- 是否包含组件清单
- 是否包含文本摘要
- 是否包含设计 Tokens
- 是否包含资源说明
- 是否包含 Angular 实现建议
- 是否明确禁止复制 `preview.html` DOM

如果内容不足，需要修复 `design-context-generator.js`。

---

### 5.9 检查 assets-map.json

检查：

- 是否引用 `screenshot.png`
- `screenshot.png` 是否真实存在
- `assets` 是否为数组
- 资源路径是否存在
- warnings 是否清晰

如果图片资源路径错误，需要修复资源导出逻辑或路径生成逻辑。

---

### 5.10 执行基础工程命令

完成修复后执行：

```text
npm run build
npm run test
```

如存在专用校验命令，也需要执行：

```text
npm run handoff:validate -- tmp/design-handoff/manual-export/<package-name>
```

结果写入：

```text
docs/design-handoff/phase1-validation.md
```

---

## 6. 输出文档

新增：

```text
docs/design-handoff/phase1-validation.md
```

文档需要包含：

1. 验证目标
2. 回传包路径
3. 验证时间
4. 验证环境
5. 文件结构检查结果
6. JSON 合法性检查结果
7. `handoffId` 贯通检查结果
8. `preview.html` 静态检查结果
9. `interaction-bridge.js` 静态检查结果
10. `design-context.md` 检查结果
11. `assets-map.json` 检查结果
12. 修复的问题
13. 未修复的问题
14. 下一步建议

---

## 7. 不要做

本阶段不要做：

- 不接入 Hub V2 页面
- 不实现右侧 Handoff 面板
- 不实现 iframe 页面联动
- 不增强 `.sketch` 文件直接解析
- 不解析旧 Sketch Measure HTML
- 不做普通 HTML 转 Handoff
- 不重写整个插件
- 不新增复杂功能
- 不做大规模重构
- 不伪造 Mac / Sketch 运行结果
- 不伪造 preview.html 视觉验收结果

---

## 8. 验收标准

### 8.1 回传包校验

- 真实回传包路径已记录。
- 文件结构检查完成。
- JSON 合法性检查完成。
- `handoffId` 贯通检查完成。
- `preview.html` 静态结构检查完成。
- `interaction-bridge.js` 静态检查完成。
- `design-context.md` 检查完成。
- `assets-map.json` 检查完成。

### 8.2 修复质量

- 只修复真实导出包暴露的阻塞问题。
- 没有无关重构。
- 没有扩大需求范围。
- 旧 Handoff Package 兼容性不被破坏。

### 8.3 工程质量

- `npm run build` 通过，或失败原因已记录。
- `npm run test` 通过，或失败原因已记录。
- handoff 校验命令可执行。
- 校验输出清晰。

### 8.4 文档

- `docs/design-handoff/phase1-validation.md` 已创建。
- 文档记录真实验证结果。
- 未执行项明确标记为未执行。
- 不写虚假的通过结论。

---

## 9. 推荐提交信息

```text
test(design-handoff): validate manual sketch export package
```

---

## 10. 完成后的下一阶段

Phase 1 完成后，再进入 Hub V2 / ng-manager 集成阶段。

下一阶段重点：

```text
接入 Handoff Package 到 Hub V2 / ng-manager
实现 iframe 加载 preview.html
实现右侧 Handoff 面板读取 layer-tree / components / handoff-map
实现 iframe 与右侧面板的 handoffId 双向联动
```
