# 任务：增强 Design Handoff Sketch 插件导出体验

## 背景

当前 ng-manager 自定义 Sketch 插件已经具备基础导出能力，但实际使用体验还不够完整。

与旧 Sketch Measure 相比，目前缺少：

- 导出整个设计稿
- 手动勾选 Page / Artboard 后导出
- 导出过程进度提示
- 中文菜单和中文操作提示
- 导出完成后的清晰反馈
- 失败原因和导出日志

本任务目标是让插件具备更接近旧 Sketch Measure 的基础交付体验。

---

## 目标

增强 Sketch 插件交互体验，完成：

1. 插件菜单中文化。
2. 插件提示信息中文化。
3. 新增导出整个文档能力。
4. 新增自定义勾选导出能力。
5. 导出时显示进度。
6. 导出完成后显示结果摘要。
7. 导出失败时显示明确原因。
8. 生成导出日志。

---

## 修改范围

主要修改：

- packages/design-handoff/sketchplugin/ngm-ai-handoff.sketchplugin/Contents/Sketch/manifest.json
- packages/design-handoff/sketchplugin/ngm-ai-handoff.sketchplugin/Contents/Sketch/main.js
- packages/design-handoff/sketchplugin/ngm-ai-handoff.sketchplugin/Contents/Sketch/exporter.js
- packages/design-handoff/sketchplugin/ngm-ai-handoff.sketchplugin/Contents/Sketch/settings.js

可以新增：

- packages/design-handoff/sketchplugin/ngm-ai-handoff.sketchplugin/Contents/Sketch/i18n.js
- packages/design-handoff/sketchplugin/ngm-ai-handoff.sketchplugin/Contents/Sketch/artboard-utils.js
- packages/design-handoff/sketchplugin/ngm-ai-handoff.sketchplugin/Contents/Sketch/export-progress.js
- packages/design-handoff/sketchplugin/ngm-ai-handoff.sketchplugin/Contents/Sketch/export-scope-dialog.js
- packages/design-handoff/sketchplugin/ngm-ai-handoff.sketchplugin/Contents/Sketch/document-index-generator.js

---

## 任务 1：插件菜单中文化

将插件菜单改为中文。

建议菜单结构：

- NGM AI Handoff
  - 导出选中画板
  - 导出当前页面
  - 导出整个文档
  - 自定义导出...
  - 设置...

对应原菜单：

- Export Selected Artboard → 导出选中画板
- Export Current Page → 导出当前页面
- Export Whole Document → 导出整个文档
- Export Custom... → 自定义导出...
- Settings... → 设置...

要求：

- manifest.json 中菜单名称改为中文
- handler 命名可以保持英文
- 内部代码函数名不用强制中文化
- 用户可见内容全部中文化

---

## 任务 2：提示信息中文化

所有用户可见提示改为中文。

包括：

- UI.message
- UI.alert
- 设置窗口标题
- 导出成功提示
- 导出失败提示
- 未选择画板提示
- 当前页面无画板提示
- 导出路径提示
- warning 提示

示例：

- 未打开 Sketch 文档
- 请先选择一个画板，或选择画板内任意图层
- 当前页面没有可见画板
- 正在导出第 3 / 12 个画板：登录页
- 导出完成：成功 12 个，失败 0 个
- 导出失败，请查看导出日志
- 输出目录：xxx

建议新增 `i18n.js`，集中管理中文文案，避免文案散落在各文件中。

---

## 任务 3：新增导出整个文档

新增菜单：

- 导出整个文档

功能：

- 遍历当前 Sketch document 下所有 Page
- 每个 Page 下收集可见 Artboard
- 逐个导出 Artboard
- 每个 Artboard 仍然输出标准 Handoff Package
- 生成文档级索引

输出结构建议：

- documentName/
  - handoff-index.json
  - index.html
  - page-001-pageName/
    - artboard-001-artboardName__shortId/
    - artboard-002-artboardName__shortId/
  - page-002-pageName/
    - artboard-001-artboardName__shortId/

要求：

- 不同 Page 下同名 Artboard 不覆盖
- 同一 Page 下同名 Artboard 不覆盖
- 导出结果中记录 Page 名、Artboard 名、输出目录

---

## 任务 4：新增自定义勾选导出

新增菜单：

- 自定义导出...

功能：

- 弹出选择窗口
- 展示当前文档中的 Page / Artboard
- 用户手动勾选需要导出的 Artboard
- 支持确认和取消
- 只导出勾选的 Artboard

第一版可以简化为：

- 列出所有 Artboard
- 每行显示：Page 名 / Artboard 名
- 每行一个 checkbox
- 支持全选
- 支持取消
- 支持确认导出

不要求第一版做复杂树形 UI，但要能完成手动勾选导出。

---

## 任务 5：增强导出选中画板

当前导出选中画板只识别直接选中的 Artboard。

需要增强为：

- 选中 Artboard 时，导出该 Artboard
- 选中 Artboard 内部图层时，自动找到父级 Artboard
- 选中多个内部图层时，收集所属 Artboard 并去重
- 找不到 Artboard 时，用中文明确提示

提示示例：

- 未找到可导出的画板
- 请选中画板，或选中画板内任意图层后重试

---

## 任务 6：增强导出当前页面

当前导出当前页面需要增强：

- 导出当前 Page 下所有可见 Artboard
- 导出前统计识别到的 Artboard 数量
- 导出过程中显示进度
- 导出完成后显示成功数量和失败数量
- 如果只识别到 1 个 Artboard，需要提示用户检查其他对象是否为 Group / Symbol / hidden

---

## 任务 7：导出过程增加进度提示

导出过程必须有可见反馈。

第一版至少做到：

- 开始导出时提示
- 每导出一个 Artboard 更新一次进度
- 导出完成时提示摘要
- 导出失败时提示原因

示例提示：

- 正在收集画板...
- 共识别到 12 个画板
- 正在导出第 1 / 12 个：登录页
- 正在生成截图：登录页
- 正在生成 Handoff JSON：登录页
- 正在生成预览页面：登录页
- 正在生成 AI 上下文：登录页
- 导出完成：成功 12 个，失败 0 个

如果 Sketch API 支持进度窗口，优先实现进度窗口。

如果进度窗口实现成本较高，第一版可以先用：

- UI.message
- 导出日志
- 导出完成弹窗

但不能完全没有反馈。

---

## 任务 8：导出完成后显示结果摘要

导出完成后弹出中文摘要。

摘要至少包含：

- 导出模式
- 导出 Page 数
- 导出 Artboard 数
- 成功数量
- 失败数量
- warning 数量
- 输出根目录

示例：

导出完成

- 模式：导出当前页面
- 页面：0-登录页
- 成功：4 个画板
- 失败：0 个
- 输出目录：/Users/xxx/Desktop/ngm-ai-handoff/xxx

如果 Sketch API 支持，导出完成后打开 Finder 到输出目录。

---

## 任务 9：导出失败时显示明确原因

导出失败时不要静默失败。

需要显示：

- 失败的 Artboard 名称
- 失败原因
- 日志路径
- 是否已部分导出成功

示例：

导出失败

- 失败画板：手机号登录-输入
- 原因：截图导出失败
- 已成功导出：3 个画板
- 请查看日志：xxx/ngm-handoff-export.log

---

## 任务 10：生成导出日志

每次导出生成：

- ngm-handoff-export.log

日志内容包括：

- 导出时间
- 导出模式
- 文档名
- Page 数
- Artboard 数
- 当前导出进度
- 成功列表
- 失败列表
- warning 列表
- 输出目录

日志建议放在导出根目录。

---

## 任务 11：生成文档级索引

导出当前页面、整个文档、自定义导出时，需要生成索引。

至少生成：

- handoff-index.json

可选生成：

- index.html

handoff-index.json 至少包含：

- documentName
- exportedAt
- mode
- outputRoot
- pages
- artboards
- previewHtml path
- screenshot path
- packageDir
- warnings
- errors

---

## 不要做

- 不接入 Hub V2 页面
- 不实现右侧 Handoff 面板
- 不增强 .sketch parser
- 不解析旧 Sketch Measure HTML
- 不重写整个 exporter
- 不引入复杂 UI 框架
- 不做云端能力
- 不做账号权限
- 不破坏现有 Handoff Package 结构

---

## 验收标准

1. 插件菜单显示中文。
2. 用户可见提示全部中文化。
3. 插件包含“导出整个文档”菜单。
4. 插件包含“自定义导出...”菜单。
5. 自定义导出可以手动勾选 Artboard。
6. 导出当前页面时能显示识别到的 Artboard 数量。
7. 导出过程中有进度提示。
8. 导出完成后有中文结果摘要。
9. 导出失败时有明确中文错误提示。
10. 每次导出生成 ngm-handoff-export.log。
11. 多个同名 Artboard 不会互相覆盖。
12. 每个 Artboard 仍然输出标准 Handoff Package。
13. npm run build 通过。
14. npm run pack:sketch 通过。

---

## 推荐提交信息

feat(design-handoff): add chinese export workflow and progress feedback