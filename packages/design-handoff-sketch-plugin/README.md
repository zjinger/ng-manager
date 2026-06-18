# NGM AI Handoff Sketch Plugin

`@yinuo-ngm/design-handoff-sketch-plugin` 是 ng-manager Design Handoff 的 Sketch 插件包，负责从 Sketch 导出 Handoff Package。

## 功能

- 导出选中画板、当前页面、整个文档。
- 支持自定义勾选画板导出。
- 保留中文菜单、进度提示、设置入口。
- 生成 `meta.json`、`layer-tree.json`、`texts.json`、`styles.json`、`tokens.json`、`components.json`、`assets-map.json`、`agent-prompt.md` 等 Handoff Package 文件。

## 目录

```text
src/           插件源码，按 sketch/export/handoff/ui/i18n 分层
resources/     图标、模板、样式等静态资源预留目录
scripts/       构建、打包和 Node 冒烟验证脚本
sketchplugin/  Sketch 插件产物目录
```

## 构建

```bash
npm run build -w @yinuo-ngm/design-handoff-sketch-plugin
```

构建会将 `src/**/*.ts` 编译为 CommonJS，并把生成的运行时代码写入：

```text
sketchplugin/ngm-ai-handoff.sketchplugin/Contents/Sketch/
```

## 打包

```bash
npm run pack:sketch -w @yinuo-ngm/design-handoff-sketch-plugin
```

输出文件：

```text
.artifacts/sketch/ngm-ai-handoff.sketchplugin.zip
.artifacts/sketch/ngm-ai-handoff-<version>-<timestamp>-<git>.sketchplugin.zip
.artifacts/sketch/pack-manifest.json
```

## 验证

```bash
npm run test:sketch-helpers -w @yinuo-ngm/design-handoff-sketch-plugin
```

该验证只运行可在 Windows / Node 环境测试的纯辅助模块，不依赖 Sketch 或 CocoaScript runtime。
