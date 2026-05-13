# Task Analyzer 设计说明

> 项目：ng-manager  
> 模块：`packages/task`  
> 状态：阶段性收口版  
> 更新时间：2026-05-13

## 1. 定位

Task Analyzer 是 `packages/task` 中的构建分析子系统。它在 build 任务成功结束后自动运行，用于识别项目构建体系、读取构建分析产物、扫描 dist/build 输出目录，并生成统一的 `TaskAnalyzeResult`。

它不是单一 bundle analyzer 的外壳，而是 ng-manager 的本地构建分析层：

```txt
任务执行
→ 运行态解析
→ 构建体系检测
→ analyzer plan
→ stats / manifest / dist 分析
→ insights / diagnostics
→ report 持久化
→ webapp Analysis 展示
```

## 2. 设计目标

1. 本地优先：所有分析在本地完成。
2. 构建体系感知：Angular、Vite、Webpack 走不同 analyzer。
3. 统一模型：不同 analyzer 最终输出统一 `TaskAnalyzeResult`。
4. 专业工具可接入：优先使用用户项目已有 provider 和已有产物。
5. 通用兜底：provider 不存在或失败时，回退到 dist/build 扫描。
6. 可诊断：每一步通过 diagnostics 可追踪。

## 3. 当前支持能力

### 3.1 构建体系检测

`project-build-detector.ts` 识别：

| buildTool | 说明 |
|---|---|
| `angular-esbuild` | Angular v17+ application/browser-esbuild 等现代构建 |
| `angular-webpack` | Angular legacy webpack 构建 |
| `vite` | Vite / Vue3 / Rollup 构建 |
| `vue-cli-webpack` | Vue CLI webpack 项目 |
| `webpack` | 普通 webpack 项目 |
| `unknown` | 未知项目，使用 dist/build 兜底 |

同时检测 framework、package scripts、angular.json、vite.config、webpack.config 和 analyzer providers。

### 3.2 Analyzer Plan

| 项目类型 | Primary | Fallback |
|---|---|---|
| Angular esbuild | `AngularStatsAnalyzer` | `AngularDistAnalyzer` |
| Angular webpack | `AngularStatsAnalyzer` | `AngularDistAnalyzer` |
| Vite / Vue3 | `RollupVisualizerAnalyzer` | `GenericDistAnalyzer` |
| Vue CLI webpack | `WebpackStatsAnalyzer` | `GenericDistAnalyzer` |
| Webpack | `WebpackStatsAnalyzer` | `GenericDistAnalyzer` |
| Unknown | - | `GenericDistAnalyzer` |

## 4. 构建命令增强

### Angular

ng-manager 会为 Angular build 自动追加：

```bash
--stats-json
```

用于生成 Angular 官方 stats.json。该文件可被解析为 esbuild metafile 或 webpack stats。

### Vite / Vue3

ng-manager 会为 Vite build 自动追加：

```bash
--manifest
```

用于生成：

```txt
dist/.vite/manifest.json
```

manifest 只能提供 entry、chunk、imports、dynamicImports 等资源映射信息，不能提供依赖级体积。依赖级分析需要 `rollup-plugin-visualizer` raw-data JSON。

## 5. Analyze Hints

当前已引入：

```ts
export interface TaskAnalyzeHints {
  addedStatsJson?: boolean;
  addedViteManifest?: boolean;
}
```

用途：

| 字段 | 说明 |
|---|---|
| `addedStatsJson` | Angular `--stats-json` 是否由 ng-manager 自动追加 |
| `addedViteManifest` | Vite `--manifest` 是否由 ng-manager 自动追加 |

该标记用于分析产物清理：

- `addedViteManifest === true` 时，可清理自动生成的 `dist/.vite/manifest.json`
- 用户命令原本已有 `--manifest` 时，不应清理 manifest
- Angular stats.json 通常属于分析产物，读取后可清理

## 6. 统一模型

核心输出：

```ts
export interface TaskAnalyzeResult {
  runId: string;
  taskId: string;
  projectId: string;
  analyzer: string;
  createdAt: number;
  summary: TaskAnalyzeSummary;
  assets: TaskAssetInfo[];
  stats?: TaskAnalyzeStats;
  warnings?: TaskAnalyzeWarning[];
  diagnostics?: TaskAnalyzeDiagnostic[];
}
```

### Summary

用于构建概览：outputPath、durationMs、fileCount、totalRawSize、totalGzipSize、totalBrotliSize、jsRawSize、cssRawSize、assetRawSize、largestFile、topAssets。

### Assets

由 `dist-scanner.ts` 扫描，类型包括：

```ts
"js" | "css" | "html" | "image" | "font" | "map" | "asset"
```

gzip/brotli 只对 `js/css/html` 且大小在阈值内的文件计算。图片、字体等未计算时，前端展示为 `-`。

### Stats

```ts
export interface TaskAnalyzeStats {
  statsPath: string;
  format: "esbuild-metafile" | "webpack-stats" | "rollup-visualizer" | "vite-manifest" | "unknown";
  chunks: TaskAnalyzeChunk[];
  modules: TaskAnalyzeModule[];
  dependencies: TaskAnalyzeDependency[];
  insights: TaskAnalyzeInsight[];
}
```

## 7. Analyzer 说明

### AngularStatsAnalyzer

适用 Angular 项目。流程：

```txt
resolveAngularOutputPath
→ findStatsJsonCandidates
→ StatsJsonAnalyzer
→ scanDistAssets
→ buildAngularBuildInsights
→ buildDeploymentRiskInsights
→ buildAngularBudgetInsights
→ cleanupStatsJson
```

Angular 的 stats-json 是分析型 metadata，因此可生成 chunks、modules、dependencies。

### RollupVisualizerAnalyzer

适用 Vite/Vue3。优先读取：

- `dist/stats.json`
- `dist/visualizer.json`
- `dist/bundle-stats.json`
- `dist/.vite/stats.json`
- `stats.json`

推荐用户配置：

```ts
visualizer({
  template: "raw-data",
  filename: "dist/stats.json",
  gzipSize: true,
  brotliSize: true,
})
```

成功解析后输出 `stats.format = rollup-visualizer`。失败时返回 null，回退到 `GenericDistAnalyzer`。

### GenericDistAnalyzer

兜底 analyzer。只扫描 `dist` 和 `build`，不扫描 projectRoot。Vite 项目会尝试读取 `dist/.vite/manifest.json`。成功时输出 `vite-manifest`，未找到 manifest 时输出 `unknown`。

### WebpackStatsAnalyzer

读取 webpack stats.json，用于 webpack / vue-cli-webpack。失败时回退到 GenericDistAnalyzer。

## 8. Provider Capability

采用方案 C：

```txt
优先使用用户项目已有依赖和已有分析产物；
没有第三方 provider 时，使用内置通用 analyzer 兜底。
```

检测项：

| Provider | 依赖 | 用途 |
|---|---|---|
| rollup-visualizer | `rollup-plugin-visualizer` | Vite/Rollup 依赖级分析 |
| webpack-bundle-analyzer | `webpack-bundle-analyzer` | Webpack stats 分析辅助 |
| source-map-explorer | `source-map-explorer` | 未来 source map 分析预留 |
| angular-stats-json | Angular CLI 官方能力 | Angular stats 分析 |

Provider 状态：`available`、`missing-dependency`、`missing-artifact`、`unsupported`、`disabled`。

## 9. Insights 分类

```ts
type TaskAnalyzeInsightCategory =
  | "risk"
  | "optimization"
  | "migration"
  | "budget"
  | "diagnostic";
```

- risk：部署或构建风险，如 stats.json 遗留、大文件过多。
- optimization：大 chunk、大 CSS、第三方依赖占比高、重型依赖、lazy chunk 缺失、vendor 未拆分。
- budget：Angular budgets 对比。
- migration：Angular legacy webpack / application builder 迁移建议。
- diagnostic：Provider suggestion、manifest 说明、visualizer 推荐等。

## 10. Dependency Quality Insights

目标：解释“为什么 bundle 大”。

规则：

- `large-dependency`
- `dominant-dependency`
- `heavy-library-family`
- `node-modules-ratio-high`

降噪原则：

- Angular baseline 依赖不作为 heavy-library-family 提示
- 依赖 Top 可以显示 Angular core/rxjs，但优化建议聚焦可选依赖

Angular baseline 排除：`@angular/core`、`@angular/common`、`@angular/router`、`@angular/forms`、`@angular/animations`、`@angular/platform-browser`、`@angular/platform-browser-dynamic`、`@angular/cdk`、`rxjs`、`zone.js`、`tslib`。

可提示依赖：`pdfjs-dist`、`vue-pdf-next`、`monaco-editor`、`echarts`、`three`、`mapbox-gl`、`leaflet`、`moment`、`lodash`、`crypto-js`、`ant-design-vue`、`@ant-design/icons`、`ng-zorro-antd`。

## 11. Chunk Strategy Insights

目标：判断拆包策略是否合理。

规则：

- `large-initial-chunk`
- `initial-size-too-large`
- `no-lazy-chunks`
- `vendor-not-split`
- `large-css-bundle`
- `too-many-small-chunks`

适用于 Angular stats、Webpack stats、Rollup visualizer stats、Vite manifest stats。

## 12. Runtime Warning Parser

位置：

```txt
packages/task/src/runtime/task-output-parser.ts
```

职责：提取 URL、判断 ready、解析 build duration、解析 warning/error、更新 Dashboard Warnings/Errors。

已增强 Vite/Rollup warning pattern：`Use of eval ... strongly discouraged`、`didn't resolve at build time`、`(!) Some chunks are larger than 500 kB`、circular dependency、dynamic/static import warning。

Runtime parser 只影响 Dashboard，不影响 Analysis report。

## 13. 临时分析产物清理

| 产物 | 策略 |
|---|---|
| Angular stats.json | 读取后可清理 |
| Rollup visualizer JSON | 解析成功后可清理 |
| stats.html | 默认不清理 |
| Vite manifest | 仅当 `addedViteManifest === true` 时清理 |
| source map | 默认不清理 |

清理失败不影响 build success，不影响 report 保存，只记录 warning/diagnostic。

## 14. 前端展示

Analysis 页面展示：构建概览、构建提示、Stats 分析、Chunk Top、依赖 Top、模块 Top、体积分布、最大文件、文件明细、分析诊断、历史趋势。

文件明细排序：js、css、html、image、font、asset、map。同类型内按 `rawSize desc`。

## 15. 阶段性完成标准

满足以下条件后，`packages/task` 可阶段性完结：

1. Angular 项目 stats-json 分析稳定
2. Vite manifest fallback 稳定
3. Rollup visualizer raw-data 可解析
4. Webpack stats fallback 稳定
5. Provider capability 可解释
6. 临时产物清理不误删
7. Dependency / Chunk insights 降噪完成
8. Runtime warning parser 收口
9. 文档完成

## 16. 后续可选项

Source Map 深度分析、Generate Mode、Build Quality Score、Treemap 可视化增强、AI 解释优化建议、Provider 独立插件包、多项目构建质量对比。
