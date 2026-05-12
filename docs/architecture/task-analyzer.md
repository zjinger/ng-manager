# Task Analyzer 架构设计文档

> 适用项目：ng-manager / packages/task  
> 当前阶段：Phase 2.3 已验证通过  
> 文档定位：Task Analyzer 的架构说明、职责边界、数据流、API 与后续演进基线

---

## 1. 背景

ng-manager 的 Task 模块最初只负责工程任务的发现、启动、停止、日志输出与运行状态维护。随着 `serve` / `build` 类任务的能力增强，Task 模块开始承担构建结果分析能力，用于让开发者在本地快速了解：

- 构建是否成功；
- 构建产物总体积；
- Raw / Gzip / Brotli 体积；
- JS / CSS / Assets 占比；
- Chunk / Module / Dependency 结构；
- Angular 新旧构建体系；
- 部署风险；
- 构建预算超限情况；
- 多次构建历史趋势。

Task Analyzer 的目标不是替代 webpack-bundle-analyzer、rollup-plugin-visualizer 或 source-map-explorer，而是在 ng-manager 内部形成一套 **本地优先、轻依赖、可扩展、可统一展示** 的工程构建分析框架。

---

## 2. 设计目标

### 2.1 当前阶段目标

当前 Task Analyzer 已完成 Phase 1、Phase 2.1、Phase 2.2、Phase 2.3 的核心闭环：

```txt
build 成功
→ Analyzer Plan 选择合适 analyzer
→ 优先读取 stats / manifest 等构建分析产物
→ 失败时 fallback 到 dist/build 文件扫描
→ 生成统一 TaskAnalyzeResult
→ 持久化到 SQLite
→ 前端 Analysis 页面展示当前报告与历史趋势
```

### 2.2 核心原则

1. **Local-first**  
   所有分析在本机完成，不依赖远程服务。

2. **Analyzer 与 Task Runner 解耦**  
   任务执行成功与否不受 analyzer 失败影响。

3. **优先官方/原生产物，fallback 到 dist 扫描**  
   Angular 优先 `stats.json`，Vite 优先 visualizer / manifest，Webpack 优先 webpack stats。

4. **统一报告模型**  
   不管来源是 Angular、Webpack、Vite 还是 GenericDist，最终都转换为 `TaskAnalyzeResult`。

5. **诊断可解释**  
   analyzer 被跳过、失败、fallback 的原因需要通过 diagnostics 暴露。

6. **持久化轻量化**  
   第一阶段用 JSON 保存完整 report，同时提取 summary 字段做趋势查询。

---

## 3. 当前能力范围

### 3.1 已支持

| 能力 | 状态 | 说明 |
|---|---:|---|
| Angular build stats 分析 | 已支持 | 自动追加 `--stats-json`，优先解析 Angular 官方 stats |
| Angular dist fallback | 已支持 | stats 缺失或解析失败时扫描 Angular outputPath |
| Angular 构建体系识别 | 已支持 | 区分 application-builder、browser-esbuild、legacy-browser-webpack |
| Angular budget 对比 | 已支持 | 读取 angular.json budgets，生成预算超限 insight |
| Webpack / Vue CLI stats 分析 | 已支持 | 通过 `WebpackStatsAnalyzer` 解析 webpack stats |
| Vite manifest 分析 | 已支持 | 读取 `dist/.vite/manifest.json` 识别入口与 chunk |
| Generic dist/build 扫描 | 已支持 | 非 Angular 项目可扫描 `dist` / `build` |
| Raw / Gzip / Brotli | 已支持 | 对 JS/CSS/HTML 计算压缩体积 |
| Deployment risk insights | 已支持 | 检测 stats.json、stats.html、source map、大文件等风险 |
| Analyzer diagnostics | 已支持 | 记录 detect/supports/analyze/parse/fallback 阶段 |
| SQLite 持久化 | 已支持 | 保存完整 report 与 summary 快速字段 |
| 历史趋势展示 | 已支持 | 前端 Analysis 页面显示最近构建记录与 delta |

### 3.2 暂不支持

| 能力 | 状态 | 说明 |
|---|---:|---|
| Source Map 深度反解 | 暂不做 | 涉及性能与源码隐私边界 |
| webpack-bundle-analyzer 内嵌 UI | 暂不做 | 不把 ng-manager 变成第三方 UI 壳 |
| rollup-plugin-visualizer 自动注入 | 暂不做 | 不自动修改用户项目配置 |
| Next.js / Nuxt / SSR 构建分析 | 暂不做 | 输出结构复杂，后续单独设计 |
| 多项目构建排行榜 | 暂不做 | 等历史趋势稳定后再评估 |
| AI 自动解释报告 | 暂不做 | 后续作为工程辅助点接入 |

---

## 4. 总体架构

```txt
packages/task
└── src/analyzer
    ├── task-analyzer.service.ts       # Analyzer 调度、diagnostics、report cache/store
    ├── task-analyzer.types.ts         # 统一类型定义
    ├── project-build-detector.ts      # 构建体系检测
    ├── stats-json-analyzer.ts         # 通用 stats.json 解析入口
    ├── angular-stats-analyzer.ts      # Angular stats wrapper
    ├── angular-dist-analyzer.ts       # Angular dist fallback
    ├── webpack-stats-analyzer.ts      # Webpack / Vue CLI stats wrapper
    ├── rollup-visualizer-analyzer.ts  # Rollup visualizer 报告读取
    ├── generic-dist-analyzer.ts       # 非 Angular dist/build fallback
    ├── dist-scanner.ts                # 文件扫描、raw/gzip/brotli 计算
    ├── parsers
    │   ├── esbuild-metafile.parser.ts
    │   └── webpack-stats.parser.ts
    ├── insights
    │   ├── size-insights.ts
    │   ├── dependency-insights.ts
    │   ├── angular-build-insights.ts
    │   ├── angular-budget-insights.ts
    │   └── deployment-risk-insights.ts
    └── utils
        ├── asset-summary.ts
        └── module-path.ts
```

### 4.1 分层说明

| 层级 | 代表模块 | 职责 |
|---|---|---|
| Detector | `project-build-detector.ts` | 判断项目框架与构建体系 |
| Planner | `TaskAnalyzerService.createPlan()` | 根据构建体系选择 analyzer |
| Analyzer | `AngularStatsAnalyzer` 等 | 生成统一 report |
| Parser | `esbuild-metafile.parser.ts` | 将原始 stats 转换为统一 stats |
| Scanner | `dist-scanner.ts` | 扫描构建产物并计算体积 |
| Insight | `insights/*` | 输出风险、优化、迁移、预算提示 |
| Store | `SqliteTaskAnalyzeReportRepo` | 持久化 report 与 summary |
| UI | `task-analysis` | 展示报告与历史趋势 |

---

## 5. Analyzer Plan

Analyzer Plan 由 `TaskAnalyzerService` 根据 `detectProjectBuild()` 的结果生成。

### 5.1 当前调度规则

| buildTool | primary | fallback |
|---|---|---|
| `angular-esbuild` | `AngularStatsAnalyzer` | `AngularDistAnalyzer` |
| `angular-webpack` | `AngularStatsAnalyzer` | `AngularDistAnalyzer` |
| `vite` | `RollupVisualizerAnalyzer` | `GenericDistAnalyzer` |
| `webpack` | `WebpackStatsAnalyzer` | `GenericDistAnalyzer` |
| `vue-cli-webpack` | `WebpackStatsAnalyzer` | `GenericDistAnalyzer` |
| `unknown` | 无 | `GenericDistAnalyzer` |

### 5.2 调度流程

```txt
TaskAnalyzerService.analyze()
├── 跳过非 build / 非 success 任务
├── detectProjectBuild(projectRoot)
├── createPlan(detection)
├── primary analyzers
├── custom analyzers
├── fallback analyzers
├── 成功生成 report 后持久化
└── 失败时只记录 diagnostics，不影响 task success
```

### 5.3 Fallback 原则

- primary analyzer 返回 `null` 时继续 fallback；
- primary analyzer 抛错时记录 diagnostic 并继续 fallback；
- fallback 成功后，report 中应保留前面 analyzer 的跳过/失败原因；
- 所有 analyzer 都失败时，task 本身仍然保持 success，只是没有 report。

---

## 6. 构建体系检测

`project-build-detector.ts` 负责识别项目类型。

### 6.1 ProjectBuildTool

```ts
export type ProjectBuildTool =
  | 'angular-esbuild'
  | 'angular-webpack'
  | 'vite'
  | 'vue-cli-webpack'
  | 'webpack'
  | 'unknown';
```

### 6.2 AngularBuildSystem

```ts
export type AngularBuildSystem =
  | 'legacy-browser-webpack'
  | 'browser-esbuild'
  | 'application-builder'
  | 'unknown';
```

### 6.3 Angular 新旧体系识别依据

主要依据：

- `angular.json` 中 build target 的 `builder`；
- 是否使用 `@angular/build`；
- 是否仍使用 `@angular-devkit/build-angular`；
- 是否存在旧 SSR / prerender builder；
- `outputPath` 是 string 还是 object；
- 是否存在 `tsconfig.server.json`；
- `tsconfig.app.json` 是否开启 `esModuleInterop`。

### 6.4 Angular 官方迁移对应关系

Angular 官方 `ng update @angular/cli --name use-application-builder` 会将旧 `browser` / `browser-esbuild` 目标迁移为 `application`，因此 analyzer 可以据此给出迁移建议。

| builder | 识别结果 | 说明 |
|---|---|---|
| `@angular-devkit/build-angular:browser` | `legacy-browser-webpack` | 旧 webpack browser builder |
| `@angular-devkit/build-angular:browser-esbuild` | `browser-esbuild` | 新体系过渡形态 |
| `@angular-devkit/build-angular:application` | `application-builder` | 新 application builder |
| `@angular/build:application` | `application-builder` | 新低依赖 application builder |

---

## 7. Analyzer 职责说明

## 7.1 StatsJsonAnalyzer

文件：

```txt
packages/task/src/analyzer/stats-json-analyzer.ts
```

职责：

- 读取 `stats.json`；
- 解析 JSON；
- 判断是否为 esbuild metafile；
- 判断是否为 webpack stats；
- 调用对应 parser；
- 返回 `TaskAnalyzeStats`；
- 返回 parse 阶段 diagnostics。

不负责：

- Angular outputPath；
- stats.json 查找；
- stats.json 清理；
- deployment risk；
- Angular migration insight；
- UI 展示。

### 7.2 AngularStatsAnalyzer

职责：

- 仅处理 Angular build；
- 解析 Angular outputPath；
- 查找 Angular build 产生的 `stats.json`；
- 调用 `StatsJsonAnalyzer`；
- 读取成功后清理 `stats.json`，避免部署风险；
- 扫描 outputPath 获取 assets；
- 生成 Angular build insights；
- 生成 deployment risk insights；
- 生成 Angular budget insights；
- 组装 `TaskAnalyzeResult`。

### 7.3 AngularDistAnalyzer

职责：

- 作为 Angular fallback analyzer；
- 不依赖 stats.json；
- 根据 Angular outputPath 扫描 dist；
- 生成基础 assets report；
- 保证 Angular build 即使没有 stats 也能有报告。

### 7.4 WebpackStatsAnalyzer

职责：

- 处理 `webpack` / `vue-cli-webpack`；
- 只查找允许范围内的 `stats.json`：
  - `dist/stats.json`
  - `build/stats.json`
  - `stats.json`
- 调用 `StatsJsonAnalyzer`；
- 只接受 `webpack-stats` 格式；
- 如有 `dist` / `build`，扫描实际 assets；
- 如无 `dist` / `build`，可基于 webpack stats 生成兜底 assets；
- 不扫描 projectRoot。

### 7.5 RollupVisualizerAnalyzer

职责：

- 处理 Vite/Rollup 项目中的 visualizer 产物；
- 优先读取 rollup-plugin-visualizer 的 stats 输出；
- 当前不主动安装或修改用户 Vite 配置。

### 7.6 GenericDistAnalyzer

职责：

- 处理非 Angular fallback；
- 支持 `vite`、`webpack`、`vue-cli-webpack`、`unknown`；
- 只允许扫描：
  - `dist`
  - `build`
- 禁止扫描 projectRoot；
- 如存在 `dist/.vite/manifest.json`，解析为 `vite-manifest` stats；
- manifest 失败不影响基础 dist report。

---

## 8. 统一数据模型

### 8.1 TaskAnalyzeResult

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

### 8.2 TaskAnalyzeSummary

用于快速展示和趋势查询。

```ts
export interface TaskAnalyzeSummary {
  outputPath?: string;
  durationMs?: number;
  fileCount: number;
  totalRawSize: number;
  totalGzipSize: number;
  totalBrotliSize?: number;
  jsRawSize: number;
  cssRawSize: number;
  assetRawSize: number;
  jsFileCount: number;
  cssFileCount: number;
  assetFileCount: number;
  largestFile?: {
    name: string;
    rawSize: number;
    gzipSize?: number;
    brotliSize?: number;
  };
  topAssets?: Array<{
    name: string;
    relativePath: string;
    type: TaskAssetType;
    rawSize: number;
    gzipSize?: number;
    brotliSize?: number;
    ratio?: number;
  }>;
}
```

### 8.3 TaskAnalyzeStats

```ts
export interface TaskAnalyzeStats {
  statsPath: string;
  format:
    | 'esbuild-metafile'
    | 'webpack-stats'
    | 'rollup-visualizer'
    | 'vite-manifest'
    | 'unknown';
  chunks: TaskAnalyzeChunk[];
  modules: TaskAnalyzeModule[];
  dependencies: TaskAnalyzeDependency[];
  insights: TaskAnalyzeInsight[];
}
```

### 8.4 TaskAnalyzeDiagnostic

```ts
export interface TaskAnalyzeDiagnostic {
  analyzer: string;
  status: 'success' | 'skipped' | 'failed' | 'supported' | 'no-report' | 'succeeded';
  phase: 'detect' | 'supports' | 'analyze' | 'parse' | 'fallback';
  message?: string;
  error?: string;
  data?: unknown;
  createdAt: number;
}
```

> 后续建议将 status 收敛为 `success | skipped | failed`，当前为了兼容已有实现暂时保留历史枚举。

---

## 9. Insights 体系

### 9.1 Insight Category

```ts
export type TaskAnalyzeInsightCategory =
  | 'risk'
  | 'optimization'
  | 'migration'
  | 'budget'
  | 'diagnostic';
```

### 9.2 当前 insight 来源

| 来源 | 说明 |
|---|---|
| `size-insights.ts` | 大 chunk、大模块等体积优化建议 |
| `dependency-insights.ts` | 大依赖、依赖占比等建议 |
| `angular-build-insights.ts` | Angular 构建体系与迁移建议 |
| `angular-budget-insights.ts` | Angular budgets 超限提示 |
| `deployment-risk-insights.ts` | stats.json、stats.html、source map、大文件等部署风险 |

### 9.3 展示建议

前端建议按 category 分组：

```txt
风险
预算
优化
迁移
诊断
```

低优先级 diagnostic 可折叠，避免噪音。

---

## 10. SQLite 持久化

### 10.1 当前表结构

表名：

```txt
task_analyze_reports
```

字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | TEXT PRIMARY KEY | `${taskId}:${runId}` |
| `run_id` | TEXT | 运行 ID |
| `task_id` | TEXT | 任务 ID |
| `project_id` | TEXT | 项目 ID |
| `analyzer` | TEXT | 生成报告的 analyzer |
| `created_at` | INTEGER | 报告生成时间 |
| `summary_json` | TEXT | 完整 summary JSON |
| `stats_json` | TEXT | stats JSON |
| `assets_json` | TEXT | assets JSON |
| `warnings_json` | TEXT | warnings JSON |
| `diagnostics_json` | TEXT | diagnostics JSON |
| `total_raw_size` | INTEGER | 总 raw size |
| `total_gzip_size` | INTEGER | 总 gzip size |
| `total_brotli_size` | INTEGER | 总 brotli size |
| `js_raw_size` | INTEGER | JS raw size |
| `css_raw_size` | INTEGER | CSS raw size |
| `asset_raw_size` | INTEGER | assets raw size |
| `file_count` | INTEGER | 文件数 |
| `duration_ms` | INTEGER | 构建耗时 |

### 10.2 索引

```sql
CREATE INDEX IF NOT EXISTS idx_task_analyze_reports_task_id_created_at
  ON task_analyze_reports (task_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_task_analyze_reports_project_id_created_at
  ON task_analyze_reports (project_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_task_analyze_reports_run_id
  ON task_analyze_reports (run_id);
```

### 10.3 保留策略

当前策略：

```txt
每个 task 保留最近 50 条 report
```

### 10.4 当前实现位置

```txt
packages/storage/src/sqlite/task-analyze-report.repo.ts
```

当前建表逻辑直接在 repo constructor 中执行。后续稳定后建议迁移到标准 migration 文件中。

---

## 11. Server API

### 11.1 当前报告 API

| API | 说明 |
|---|---|
| `GET /api/tasks/report/run/:runId` | 查询某次运行完整 report |
| `GET /api/tasks/report/latest/:taskId` | 查询某任务最新 report |
| `GET /api/tasks/report/history/task/:taskId?limit=20` | 查询某任务最近 N 条完整 report |
| `GET /api/tasks/report/history/project/:projectId?limit=20` | 查询某项目最近 N 条完整 report |
| `GET /api/tasks/report/summary/task/:taskId?limit=20` | 查询某任务最近 N 条 summary |
| `GET /api/tasks/report/summary/project/:projectId?limit=20` | 查询某项目最近 N 条 summary |
| `GET /api/tasks/diagnostics/run/:runId` | 查询某次运行 diagnostics |
| `GET /api/tasks/diagnostics/latest/:taskId` | 查询某任务最新 diagnostics |
| `GET /api/tasks/dashboard/:taskId` | 查询 dashboard 聚合数据 |

### 11.2 limit 规则

```txt
默认：20
最小：1
最大：100
```

### 11.3 API 使用建议

- 页面趋势图优先使用 summary API；
- 不建议默认加载完整 history report；
- 完整 report 用于详情查看。

---

## 12. 前端展示

当前页面：

```txt
webapp/src/app/pages/tasks/task-analysis
```

### 12.1 当前展示内容

- 构建总览：Raw / JS / CSS / Gzip / Brotli / 文件数；
- JS / CSS / Assets 占比条；
- 构建分析提示；
- 历史趋势；
- Top assets；
- chunks / dependencies / modules；
- diagnostics。

### 12.2 历史趋势

当前趋势使用：

```txt
GET /api/tasks/report/summary/task/:taskId?limit=10
```

展示字段：

- 构建时间；
- Raw Size；
- Gzip Size；
- Brotli Size；
- JS Size；
- CSS Size；
- Duration；
- 与上一条历史记录的 delta。

---

## 13. 关键设计边界

### 13.1 Analyzer 失败不影响 Task 成功状态

构建任务成功后，即使 analyzer 失败，也不改变 task runtime status。

### 13.2 持久化失败不影响 Task 成功状态

SQLite 写入失败只会追加 warning / diagnostic，不影响任务状态。

### 13.3 不扫描 projectRoot

非 Angular fallback 只允许扫描：

```txt
dist
build
```

禁止扫描 projectRoot，避免误扫大型 monorepo。

### 13.4 stats.json 不进入部署产物

AngularStatsAnalyzer 读取 stats.json 后会尝试清理，避免部署到生产环境。

### 13.5 不自动修改用户项目配置

Task Analyzer 不主动修改：

- `angular.json`
- `vite.config.ts`
- `webpack.config.js`
- `package.json`

---

## 14. 当前已知收口项

### 14.1 WebpackStatsAnalyzer 目录判断

`resolveDistPath()` 应使用 `isDirectory()` 判断 `dist` / `build`，不要只用 `exists()`。

### 14.2 diagnostics API 持久化兜底

如果独立 diagnostics API 重启后只查内存，会与已持久化 report 不一致。建议：

```txt
getDiagnosticsByRunId
getLatestDiagnosticsByTaskId
```

在内存不存在时，从 reportStore 中读取 report.diagnostics 兜底。

### 14.3 Core composer 类型 adapter

当前如果出现：

```ts
as unknown as TaskAnalyzeReportStore
```

建议通过 core 层 adapter 包装 storage repo，避免强转。

### 14.4 前端 refresh 重复请求

如果 `refresh()` 同时调用 `load()` 与 `loadHistory()`，而 `load()` 成功后又调用 `loadHistory()`，会导致重复请求。建议只保留 `load()`。

### 14.5 Storage 类型扩宽

storage 侧 summary 类型应兼容完整 `TaskAnalyzeSummary`，避免误认为 `outputPath`、`largestFile`、`topAssets` 未保存。

---

## 15. 后续路线

### Phase 2.4：UI 信息分层

目标：将提示信息按语义分组。

```txt
风险
预算
优化建议
迁移建议
诊断信息
历史趋势
```

任务：

- 将 insights / warnings / diagnostics 分区展示；
- 支持低优先级 diagnostic 折叠；
- 风险类提示置顶；
- 历史趋势从表格升级为轻量图形展示。

### Phase 2.5：Source Map 深度分析

目标：可选接入 source map 反解。

边界：

- 明确最大文件大小；
- 明确是否读取 `sourcesContent`；
- 默认本地分析，不上传；
- 默认不持久化原始 source map。

### Phase 2.6：第三方 Provider

候选：

- webpack-bundle-analyzer provider；
- rollup-plugin-visualizer provider；
- source-map-explorer provider。

原则：

```txt
第三方工具作为可选 provider，不进入核心依赖。
```

### Phase 2.7：AI 辅助解释

可选能力：

- 解释构建体积变化；
- 解释 budget 超限；
- 给出 Angular 迁移建议；
- 根据 diagnostics 解释 analyzer fallback 原因。

---

## 16. 验证清单

### 16.1 Angular 项目

- [ ] build 成功后生成 report；
- [ ] stats.json 被读取并清理；
- [ ] 没有 stats.json 时 AngularDistAnalyzer fallback；
- [ ] budget 超限可生成 insight；
- [ ] report 可持久化；
- [ ] 重启后 history 仍可查询。

### 16.2 Vite 项目

- [ ] 有 dist 时 GenericDistAnalyzer 可生成 report；
- [ ] 有 `.vite/manifest.json` 时可生成 vite-manifest stats；
- [ ] 没有 manifest 时仍可生成基础 report；
- [ ] 不误用 AngularDistAnalyzer。

### 16.3 Webpack / Vue CLI 项目

- [ ] 有 stats.json 时 WebpackStatsAnalyzer 可解析；
- [ ] 没有 dist/build 时不扫描 projectRoot；
- [ ] 没有 stats.json 但有 dist/build 时 GenericDistAnalyzer fallback。

### 16.4 History

- [ ] 连续 build 两次后 summary 返回两条记录；
- [ ] 重启后 history 仍存在；
- [ ] Analysis 页面能显示历史记录与 delta；
- [ ] limit 最大不超过 100。

---

## 17. 推荐维护规则

1. 新增 analyzer 必须接入 diagnostics；
2. 新增 analyzer 不得直接影响 task success 状态；
3. 新增构建体系支持时，应先更新 `project-build-detector.ts`；
4. 新增 report 字段时，应同步：
   - `packages/task`
   - `packages/protocol`
   - `webapp`
   - `storage summary`，如需要趋势；
5. 大型数据优先进入 JSON 字段，不急于拆明细表；
6. 趋势查询只返回 summary，不返回完整 assets/modules；
7. 不扫描 projectRoot；
8. 不自动修改用户项目配置。

---

## 18. 当前结论

Task Analyzer 当前已经从单纯的构建结果展示，演进为 ng-manager 的本地构建分析子系统。它具备：

```txt
Analyzer Plan
Stats 解析
Dist fallback
Insights
Diagnostics
SQLite 持久化
History trend
Frontend analysis
```

下一阶段不建议继续扩大 analyzer 支持范围，优先进行 UI 信息分层与文档化收口。
