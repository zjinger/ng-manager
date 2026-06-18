# 任务：拆分 Design Handoff 中间件与 Sketch 插件包，并参考 Sketch Measure 结构重组插件工程

## 背景

当前 packages/design-handoff 同时承担两个职责：

1. Handoff Package 中间件
2. Sketch 插件

随着插件能力扩展，继续混在一个 package 中会导致维护困难。

需要将 Sketch 插件拆分为独立 package，并参考 Sketch Measure 的工程分层思路：src / ui / resources / scripts / 构建产物分离。

注意：只参考结构，不照搬 Sketch Measure 的老旧实现方式。

## 目标

拆分为两个 package：

1. packages/design-handoff
   - 只负责 Handoff Package schema、parser、validator、scanner、generator、agent context。
   - 不依赖 Sketch。
   - 可在 Windows / Node 环境测试。

2. packages/design-handoff-sketch-plugin
   - 只负责 Sketch 插件。
   - 负责从 Sketch 导出 Handoff Package。
   - 支持中文菜单、进度提示、整稿导出、自定义勾选导出。
   - 可以依赖 @yinuo-ngm/design-handoff。

## 新目录结构

packages/design-handoff-sketch-plugin/
- src/
  - main.ts
  - sketch/
  - export/
  - handoff/
  - ui/
  - i18n/
  - utils/
- resources/
  - icons/
  - templates/
  - styles/
- sketchplugin/
  - ngm-ai-handoff.sketchplugin/
    - Contents/
      - Sketch/
        - manifest.json
        - generated js
- scripts/
  - build-plugin.ts
  - pack-sketch-plugin.ts
- package.json
- tsconfig.json
- README.md

## 拆分要求

### packages/design-handoff 保留

保留：

- src/schema
- src/parser
- src/validators
- src/scanner
- src/generator
- src/agent

调整：

- package.json description 改为 Handoff Package middleware / SDK
- files 不再包含 sketchplugin
- scripts 不再包含 pack:sketch
- README 改为中间件说明

### packages/design-handoff-sketch-plugin 新增

新增 package：

- name: @yinuo-ngm/design-handoff-sketch-plugin
- description: Sketch plugin for exporting ng-manager Handoff Package
- depends on @yinuo-ngm/design-handoff

迁移：

- sketchplugin/
- 插件相关 JS 文件
- 插件打包脚本
- 插件 README

## 插件工程结构要求

参考 Sketch Measure 的结构思想，但不要照搬旧实现。

采用：

- src：插件源码
- ui：插件交互窗口、勾选导出、进度提示
- resources：静态资源、模板、图标
- scripts：构建和打包脚本
- sketchplugin：最终 Sketch 插件产物

## 构建要求

新增构建流程：

- TypeScript 源码位于 src/
- 构建后输出到 sketchplugin/.../Contents/Sketch/
- manifest.json 保留在 sketchplugin 产物中
- npm run build 能生成插件运行时代码
- npm run pack:sketch 能打包插件

## 不要做

- 不接入 Hub V2
- 不实现右侧 Handoff 面板
- 不解析旧 Sketch Measure HTML
- 不照搬 Sketch Measure 老代码
- 不引入复杂前端框架
- 不改变 Handoff Package 标准结构
- 不做无关重构

## 验收标准

1. 新增 packages/design-handoff-sketch-plugin。
2. packages/design-handoff 不再包含 sketchplugin。
3. packages/design-handoff 不再包含 pack:sketch。
4. Sketch 插件相关代码已迁移到新 package。
5. 新插件包可以 build。
6. 新插件包可以 pack:sketch。
7. manifest 菜单不丢失。
8. 原有插件导出能力不丢失。
9. design-handoff 中间件 build/test 不受影响。
10. 两个 package 职责边界清晰。

## 推荐提交信息

refactor(design-handoff): split sketch plugin package and reorganize plugin structure