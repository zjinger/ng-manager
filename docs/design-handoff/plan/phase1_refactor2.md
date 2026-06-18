# 任务：重组 design-handoff-sketch-plugin 插件产物结构，对齐成熟 Sketch 插件分层

## 背景

当前 design-handoff-sketch-plugin 已经从 design-handoff 中拆分出来，并具备基础导出能力。

但当前 Sketch 插件运行时代码仍然偏散，preview.html 也主要由 JS 拼接生成。对比 Sketch Measure 的插件产物结构，其将 Sketch 入口、Resources、template、panel、i18n 分开，结构更适合长期维护。

本任务参考 Sketch Measure 的工程分层思想，但不照搬其老旧实现。

## 目标

将插件产物结构调整为：

ngm-ai-handoff.sketchplugin/
└── Contents/
    ├── Sketch/
    │   ├── manifest.json
    │   └── ngm_handoff_bundle.js
    └── Resources/
        ├── templates/
        ├── panel/
        ├── styles/
        └── i18n/

## 修改范围

主要修改：

- packages/design-handoff-sketch-plugin/src/
- packages/design-handoff-sketch-plugin/resources/
- packages/design-handoff-sketch-plugin/scripts/
- packages/design-handoff-sketch-plugin/sketchplugin/

## 任务 1：调整 Sketch 插件产物结构

将最终插件产物调整为：

- Contents/Sketch/manifest.json
- Contents/Sketch/ngm_handoff_bundle.js
- Contents/Resources/templates/
- Contents/Resources/panel/
- Contents/Resources/styles/
- Contents/Resources/i18n/

要求：

- manifest.json 中的 script 指向 ngm_handoff_bundle.js
- handler 保持不丢失
- 插件菜单保持可用

## 任务 2：将 runtime JS 打包为单 bundle

将当前散落在 Contents/Sketch 下的运行时代码构建为一个 bundle：

- ngm_handoff_bundle.js

要求：

- 保持 CommonJS / Sketch Runtime 可执行
- external sketch / sketch-ui 相关模块
- 不引入复杂 Web 框架
- 不破坏现有 handler 导出

## 任务 3：引入 Resources/templates

新增模板目录：

- resources/templates/preview.html
- resources/templates/index.html

第一步只做模板搬迁，不要求马上实现完整 Sketch Measure 式 inspect。

要求：

- preview-renderer 不再大段拼接 HTML skeleton
- preview-renderer 读取模板或使用模板字符串模块
- 保持现有 preview.html 功能不丢失

## 任务 4：引入 Resources/panel

新增面板资源目录：

- resources/panel/panel.html
- resources/panel/panel.css
- resources/panel/panel.js

第一版可以只是占位面板，用于后续实现：

- 图层树
- 样式信息
- 资源列表
- CSS 片段
- 组件信息

不要本阶段实现完整 inspect UI。

## 任务 5：引入 Resources/i18n

将用户可见中文文案逐步整理到：

- resources/i18n/zh-CN.json

当前 TypeScript 中的 i18n 可以先继续保留，但需要预留资源化路径。

## 任务 6：更新构建脚本

更新：

- scripts/build-plugin.ts
- scripts/pack-sketch-plugin.ts

要求：

- build 后生成新的 Contents 结构
- 自动复制 Resources
- pack:sketch 能打包完整插件
- 不遗漏 templates / panel / styles / i18n

## 不要做

- 不照搬 Sketch Measure 老代码
- 不实现完整 Sketch Measure inspect UI
- 不接入 Hub V2
- 不增强 .sketch parser
- 不解析旧 Sketch Measure HTML
- 不重写所有导出逻辑
- 不改变 Handoff Package 标准结构
- 不引入 React / Vue / Angular

## 验收标准

1. sketchplugin/Contents/Sketch 下只保留 manifest.json 和 ngm_handoff_bundle.js。
2. sketchplugin/Contents/Resources 下包含 templates / panel / styles / i18n。
3. manifest.json 正确指向 ngm_handoff_bundle.js。
4. 原有菜单 handler 不丢失。
5. 原有导出能力不丢失。
6. npm run build 通过。
7. npm run pack:sketch 通过。
8. 插件包结构比当前更接近 Sketch Measure 的成熟分层。
9. 不引入 Sketch Measure 老旧实现代码。

## 参考已有成熟 Sketch Measure 项目

Sketch Measure  项目已clone 到本地了，目录：D:\design-handoff-github\sketch-meaxure


## 推荐提交信息

refactor(design-handoff-sketch-plugin): align sketch plugin bundle and resources structure