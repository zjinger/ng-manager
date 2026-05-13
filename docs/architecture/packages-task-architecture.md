# packages/task 架构说明

> 项目：ng-manager  
> 模块：`packages/task`  
> 状态：阶段性收口版  
> 更新时间：2026-05-13

## 1. 模块定位

`packages/task` 是 ng-manager 的本地任务管理与构建分析模块。

它承担：

```txt
任务发现
→ 任务启动
→ 运行态追踪
→ 日志解析
→ 构建分析
→ 报告持久化
→ UI 展示支撑
```

在 ng-manager 架构中，它属于 Local Control Plane 的核心能力模块。

## 2. 架构原则

1. Local-first：任务执行、日志解析、构建分析全部在本地完成。
2. 不绑定 UI：只提供 runtime、dashboard、report、diagnostics、logs。
3. Analyzer 不影响 build 状态：Analyzer 是 build success 之后的后处理。
4. 多构建体系适配：Angular、Vite、Webpack、Vue CLI、Unknown 分别处理。
5. 专业 provider 可选：优先使用用户项目已有依赖和已有产物，未安装时 fallback。

## 3. 推荐目录结构

```txt
packages/task
├── src
│   ├── analyzer
│   │   ├── task-analyzer.service.ts
│   │   ├── task-analyzer.types.ts
│   │   ├── project-build-detector.ts
│   │   ├── angular-stats-analyzer.ts
│   │   ├── angular-dist-analyzer.ts
│   │   ├── webpack-stats-analyzer.ts
│   │   ├── rollup-visualizer-analyzer.ts
│   │   ├── generic-dist-analyzer.ts
│   │   ├── dist-scanner.ts
│   │   ├── angular-output-path.ts
│   │   ├── parsers
│   │   │   ├── esbuild-metafile.parser.ts
│   │   │   ├── webpack-stats.parser.ts
│   │   │   └── rollup-visualizer.parser.ts
│   │   ├── providers
│   │   │   └── provider-capability.ts
│   │   ├── insights
│   │   │   ├── angular-budget-insights.ts
│   │   │   ├── angular-build-insights.ts
│   │   │   ├── deployment-risk-insights.ts
│   │   │   ├── dependency-quality-insights.ts
│   │   │   ├── chunk-strategy-insights.ts
│   │   │   └── vite-insights.ts
│   │   └── utils
│   │       ├── asset-summary.ts
│   │       └── module-path.ts
│   ├── runtime
│   │   └── task-output-parser.ts
│   ├── infra
│   │   ├── generators
│   │   │   └── genSpecsFromScripts.ts
│   │   └── task-event-map.ts
│   ├── task.service.impl.ts
│   ├── task.service.ts
│   └── task.types.ts
```

## 4. 核心对象

### TaskDefinition

任务定义，通常来自 package scripts。核心字段：id、projectId、projectRoot、name、kind、command、args、cwd、env、shell。

### TaskRuntime

任务运行态。核心字段：taskId、projectId、runId、status、startedAt、stoppedAt、pid、exitCode、signal、urls、readyAt、warningsCount、errorsCount、rebuildDurationMs。

### TaskDashboard

Dashboard 聚合 runtime 与 latest report，包含 status、progress、sizes、problems、urls。

### TaskAnalyzeResult

构建分析报告，包含 summary、assets、stats、warnings、diagnostics。

## 5. 任务执行流程

### 5.1 刷新任务

```txt
refreshByProject(projectId)
→ projectService.get(projectId)
→ 读取 package scripts
→ genSpecsFromScripts()
→ 更新 specs map
→ 返回 TaskRow[]
```

### 5.2 启动任务

```txt
start(taskId)
→ 获取 TaskDefinition
→ 创建 runId
→ 初始化 TaskRuntime
→ prepareLaunchSpec()
→ process.spawn()
→ 绑定 stdout/stderr/onExit
→ emit TASK_STARTED
```

### 5.3 输出解析

```txt
appendTaskOutput()
→ taskStreamLog.append()
→ updateRuntimeFromOutput()
→ parseTaskOutput()
→ emit TASK_RUNTIME_UPDATED
```

### 5.4 任务退出

```txt
p.onExit()
→ 更新 runtime
→ emit TASK_EXITED
→ build success 时 analyzeAfterExit()
```

## 6. Build 命令预处理

入口：

```txt
TaskServiceImpl.prepareLaunchSpec()
```

职责：检测项目构建体系、Angular 自动追加 `--stats-json`、Vite 自动追加 `--manifest`、记录 `TaskAnalyzeHints`、输出系统日志。

## 7. TaskAnalyzeHints

```ts
export interface TaskAnalyzeHints {
  addedStatsJson?: boolean;
  addedViteManifest?: boolean;
}
```

传递链路：

```txt
prepareLaunchSpec()
→ analyzeHintsByRunId
→ analyzeAfterExit()
→ TaskAnalyzerService.analyze()
→ TaskAnalyzeContext
```

用途：判断 stats/manifest 是否由 ng-manager 临时生成，支撑清理策略，避免误删用户本来需要部署的 manifest。

## 8. Analyzer Service

核心类：`TaskAnalyzerService`。

职责：

1. 判断是否 build success
2. 调用 `detectProjectBuild`
3. 创建 analyzer plan
4. 执行 primary/custom/fallback analyzers
5. 收集 diagnostics
6. 持久化 report
7. 维护 latest report cache

执行顺序：

```txt
primary
→ custom
→ fallback
```

任意 analyzer 成功返回 report 后停止。异常会记录 diagnostic，但不会中断 fallback。

## 9. Analyzer Plan

```txt
angular-esbuild
→ AngularStatsAnalyzer
→ AngularDistAnalyzer

angular-webpack
→ AngularStatsAnalyzer
→ AngularDistAnalyzer

vite
→ RollupVisualizerAnalyzer
→ GenericDistAnalyzer

vue-cli-webpack / webpack
→ WebpackStatsAnalyzer
→ GenericDistAnalyzer

unknown
→ GenericDistAnalyzer
```

## 10. Analyzer 说明

- AngularStatsAnalyzer：读取 Angular stats.json，生成 summary、assets、chunks、modules、dependencies、budget insights、deployment risk insights。
- AngularDistAnalyzer：Angular fallback，仅基于 Angular outputPath 扫描构建产物。
- WebpackStatsAnalyzer：读取 webpack stats.json，生成 chunk/module/dependency 分析。
- RollupVisualizerAnalyzer：读取 rollup-plugin-visualizer JSON/raw-data，成功时 `stats.format = rollup-visualizer`。
- GenericDistAnalyzer：兜底，只扫描 dist/build，Vite 项目读取 `.vite/manifest.json`。

## 11. Parser 层

`StatsJsonAnalyzer` 根据 JSON 结构分发：

| JSON 结构 | Parser |
|---|---|
| `inputs + outputs` | esbuild metafile |
| `assets / chunks / modules` | webpack stats |

`rollup-visualizer.parser` 解析 rollup-plugin-visualizer raw-data，生成 modules、dependencies 和可选 chunks。

## 12. dist-scanner

职责：扫描构建输出目录、识别 asset 类型、统计 raw/gzip/brotli、输出 `TaskAssetInfo[]`。

限制：

- 只扫描指定 outputPath
- 不扫描 projectRoot
- gzip/brotli 只对 js/css/html 计算
- image/font/map 不强制计算压缩体积

## 13. Provider Capability

文件：

```txt
providers/provider-capability.ts
```

职责：判断当前项目是否具备专业分析能力。

Provider 状态：

```ts
"available" | "missing-dependency" | "missing-artifact" | "unsupported" | "disabled"
```

## 14. Insights 层

- deployment-risk-insights：部署风险。
- angular-budget-insights：Angular budgets 对比。
- dependency-quality-insights：依赖质量分析。
- chunk-strategy-insights：chunk 策略分析。
- vite-insights：Vite/Rollup 专项建议。

## 15. Runtime Parser

文件：

```txt
runtime/task-output-parser.ts
```

职责：normalize ANSI、提取 URL、判断 ready、解析 duration、解析 warnings/errors、支持 Vite/Rollup warning pattern。

Runtime parser 只影响 Dashboard，不影响 Analysis report。

## 16. 持久化

通过 `TaskAnalyzeReportStore` 持久化：

- save
- getByRunId
- listByTaskId
- listByProjectId
- listSummaryByTaskId
- listSummaryByProjectId

用于历史趋势、构建记录、最新报告查询。

## 17. 事件模型

任务模块发出：

- TASK_STARTED
- TASK_OUTPUT
- TASK_RUNTIME_UPDATED
- TASK_EXITED
- TASK_FAILED
- TASK_ANALYZE_STARTED
- TASK_ANALYZE_FINISHED
- TASK_ANALYZE_FAILED
- TASK_SPECS_REFRESHED

## 18. 风险与边界

1. 不扫描 projectRoot。
2. Analyzer 失败不影响 build。
3. 不自动安装第三方工具。
4. 不自动修改 vite.config、webpack.config、angular.json。
5. Insights 应聚焦可操作建议，避免把框架基础依赖当成问题。

## 19. 阶段性完结标准

`packages/task` 可阶段性完结的标准：

1. Angular 分析稳定
2. Vite manifest fallback 稳定
3. Rollup visualizer raw-data 可解析
4. Webpack stats fallback 稳定
5. Provider capability 可解释
6. 临时产物清理安全
7. Dependency/Chunk insights 降噪
8. Runtime warning parser 收口
9. 文档完成

## 20. 后续维护方向

后续仅建议做 bugfix、parser 兼容、真实项目适配、文档更新、小型 UI 体验修正。

新能力后置：Source Map 深度分析、Generate Mode、Build Quality Score、Treemap 可视化、AI 构建解释、Provider 插件包化。
