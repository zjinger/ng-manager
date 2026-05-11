# Task Analyzer 架构说明

> 本文档记录 `@yinuo-ngm/task` 中 Task Analyzer 的当前边界、Phase 1 支持范围、明确不做的能力，以及后续演进候选项。
>
> 目标：让构建分析能力保持轻量、可解释、可回退，并避免把 analyzer 核心包演进成重型第三方分析工具集合。

## 1. 当前定位

Task Analyzer 是 Task 模块中的构建结果分析能力，主要位于：

```txt
packages/task/src/analyzer
webapp/src/app/pages/tasks/task-analysis
```

它只在以下条件满足时触发：

- task kind 为 `build`
- runtime status 为 `success`

非 build 任务不会触发 build report analyzer。`serve` 的运行状态、URL、最近编译耗时、warning/error 等仍由 runtime output parser 负责。

## 2. Analyzer Plan

Task Analyzer 当前不是简单的线性 analyzer 列表，而是先检测项目构建体系，再生成 analyzer plan。

入口流程：

```txt
TaskAnalyzerService.analyze()
  -> detectProjectBuild(projectRoot)
  -> createPlan(detection)
  -> primary analyzers
  -> custom analyzers
  -> fallback analyzers
```

当前内置 plan：

| buildTool | primary | fallback |
|---|---|---|
| `angular-esbuild` | `AngularStatsAnalyzer` | `AngularDistAnalyzer` |
| `angular-webpack` | `AngularStatsAnalyzer` | `AngularDistAnalyzer` |
| `vite` | `RollupVisualizerAnalyzer` | 无 |
| `vue-cli-webpack` | `AngularStatsAnalyzer` 暂时复用 webpack stats parser | 无 |
| `webpack` | `AngularStatsAnalyzer` 暂时复用 webpack stats parser | 无 |
| `unknown` | 无 | 无 |

约束：

- `customAnalyzers` 作为扩展插入到 primary 与 fallback 之间，不覆盖内置 plan。
- 单个 analyzer 抛错不会中断整个分析流程，后续 analyzer 仍可继续执行。
- `AngularDistAnalyzer` 只作为 Angular 项目的兜底扫描能力，不作为 Vite/Vue/React 的通用 dist analyzer。

## 3. Phase 1 支持范围

### 3.1 Angular 构建体系检测

当前检测 Angular build target，兼容 `architect` 和 `targets`。

支持识别：

| Angular builder | buildSystem | buildTool |
|---|---|---|
| `:browser` | `legacy-browser-webpack` | `angular-webpack` |
| `:browser-esbuild` | `browser-esbuild` | `angular-esbuild` |
| `:application` | `application-builder` | `angular-esbuild` |

同时记录 Angular 专属检测信息：

- 是否使用 `@angular/build`
- 是否使用 `@angular-devkit/build-angular`
- 是否存在旧 SSR / prerender builder
- 是否存在 `tsconfig.server.json`
- `tsconfig.app.json` 及其 `extends` 链中的 `compilerOptions.esModuleInterop`
- Angular `outputPath` 的 string/object 形态
- 迁移相关 hints

### 3.2 Angular stats 与 dist fallback

Angular build 会保留自动追加 `--stats-json` 的能力，用于优先读取 stats 输出。

策略：

```txt
AngularStatsAnalyzer
  -> 读取 stats.json / esbuild metafile / webpack stats
  -> parse stats
  -> 清理 stats.json
  -> 扫描 dist assets
  -> 输出 report

AngularDistAnalyzer fallback
  -> 解析 Angular outputPath
  -> 扫描 dist assets
  -> 输出基础 assets report
```

如果 stats 不存在、不可解析或 analyzer 失败，Angular 项目仍可通过 `AngularDistAnalyzer` 生成基础报告。

`stats.json` 成功读取后默认清理，避免分析文件进入部署产物。清理成功作为机器可读 warning 保留在 report 中，但前端默认不展示成功提示；清理失败会作为提示展示。

### 3.3 Vite / Rollup visualizer

Vite 项目当前只支持读取 `rollup-plugin-visualizer` 产出的 `stats.json` / `stats.html` 一类报告。

当前阶段没有 Vite fallback dist analyzer。没有 visualizer 输出时可以返回 `null`。

### 3.4 Webpack stats 兼容

`vue-cli-webpack` / `webpack` 当前暂时复用 `AngularStatsAnalyzer` 中的 webpack stats parser。

该逻辑是过渡实现，后续应拆成独立 `WebpackStatsAnalyzer` 或 `StatsJsonAnalyzer`。

### 3.5 Report 内容

Phase 1 report 包含：

- summary
  - total raw/gzip/brotli size
  - JS/CSS/asset raw size
  - file counts
  - largest file
  - top assets
- assets
  - raw size
  - gzip size
  - brotli size
  - type
  - relative path
- stats
  - chunks
  - modules
  - dependencies
  - insights
- warnings
  - analyzer 运行过程中的非阻断提示，例如 stats 清理结果

### 3.6 Insights

当前内置 insights 保持轻量，不依赖第三方分析库。

已支持：

- size insights
  - large chunk
  - large dependency
  - large module
- Angular build insights
  - legacy browser webpack 迁移提示
  - browser-esbuild 过渡形态提示
  - legacy SSR/prerender 相关提示
- deployment risk insights
  - dist 中残留 `stats.json`
  - dist 中残留 `stats.html`
  - source map 文件
  - 超过 2MB 的构建产物 Top 10
  - 多个超过 500KB 的 initial chunk Top 10

提示展示原则：

- 正常成功状态不提示。
- 能被自动修复且已成功修复的问题不在 UI 中打扰用户。
- 同一问题避免重复提示，例如单个大 initial chunk 不再额外生成 Top N 汇总提示。

## 4. 当前不做的能力

Phase 1 明确不做：

- 不引入 `webpack-bundle-analyzer`
- 不引入 `rollup-plugin-visualizer`
- 不引入 `source-map-explorer`
- 不自动修改用户项目配置
- 不生成第三方 HTML 报告
- 不做 source map 深度反解
- 不做 bundle 内容可视化图谱
- 不做按源码行级别归因
- 不做 SQLite / 数据库持久化
- 不把 `AngularDistAnalyzer` 用作非 Angular 项目的 fallback
- 不在 dashboard 中重复展示构建体积明细，构建体积统一放在 analyzer view

## 5. 下一阶段候选项

后续可以按优先级拆分推进：

1. 抽出通用 stats analyzer
   - 将 webpack stats parser 从 `AngularStatsAnalyzer` 中拆出。
   - 新增 `WebpackStatsAnalyzer` 或 `StatsJsonAnalyzer`。

2. 增加 GenericDistAnalyzer
   - 面向 Vite / React / Vue / unknown 项目提供通用 dist 扫描 fallback。
   - 需要先定义非 Angular 项目的 outputPath 推断规则。

3. 增强 Vite 支持
   - 支持更多 visualizer 输出形态。
   - 支持 Vite manifest / rollup bundle metadata。

4. Analyzer diagnostics
   - 当前 analyzer 失败会吞掉异常以保证 fallback。
   - 后续可增加内部 diagnostics，帮助排查 analyzer 为什么跳过或失败。

5. 持久化与历史趋势
   - 将 report 持久化到 SQLite。
   - 支持按 task/run 查看历史构建体积趋势。

6. 更专业的 source map 分析
   - 可选接入 source map 反解。
   - 需要明确性能边界和隐私边界。
   
7. 构建预算 budget 对比(针对 angular 项目中会配置构建预算，但目前没有对比提示)
    - 支持用户配置构建预算，例如单文件大小、总大小、初始 chunk 大小等。
    - 在 analyzer report 中对比预算，生成超预算提示。

8. UI 信息分层
   - 将 insights 分为风险、优化建议、迁移建议、诊断信息。
   - 支持折叠低优先级提示，减少噪音。
  
9. AI 解释构建报告
    - 接入 AI 模型，提供自然语言解释和优化建议。
    - 需要明确隐私边界和使用场景。

## 6. 维护原则

- Analyzer 核心包保持轻量。
- 第三方工具可以作为可选数据源，不作为核心依赖。
- build system detection 是 analyzer plan 的输入，不应在每个 analyzer 中重复检测。
- fallback analyzer 应保证稳定、保守，不产生语义错误。
- Report API 保持兼容，新增字段优先使用 optional。
- 前端展示优先减少噪音，默认只提示需要用户处理的问题。
