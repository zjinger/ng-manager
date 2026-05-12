import type { TaskDefinition, TaskRuntime } from "../task.types";
import { AngularDistAnalyzer } from "./angular-dist-analyzer";
import { AngularStatsAnalyzer } from "./angular-stats-analyzer";
import { detectProjectBuild, type ProjectBuildDetection } from "./project-build-detector";
import { GenericDistAnalyzer } from "./generic-dist-analyzer";
import { RollupVisualizerAnalyzer } from "./rollup-visualizer-analyzer";
import { WebpackStatsAnalyzer } from "./webpack-stats-analyzer";
import type {
    TaskAnalyzeDiagnostic,
    TaskAnalyzeReportStore,
    TaskAnalyzeReportSummary,
    TaskAnalyzeResult,
    TaskAnalyzer,
} from "./task-analyzer.types";

interface AnalyzerPlan {
    primary: TaskAnalyzer[];
    fallback: TaskAnalyzer[];
}

interface AnalyzerStep {
    analyzer: TaskAnalyzer;
    stage: "primary" | "custom" | "fallback";
}

export class TaskAnalyzerService {
    private reportsByRunId = new Map<string, TaskAnalyzeResult>();
    private latestReportByTaskId = new Map<string, TaskAnalyzeResult>();
    private diagnosticsByRunId = new Map<string, TaskAnalyzeDiagnostic[]>();
    private latestDiagnosticsByTaskId = new Map<string, TaskAnalyzeDiagnostic[]>();

    private angularStats = new AngularStatsAnalyzer();
    private webpackStats = new WebpackStatsAnalyzer();
    private rollupVisualizer = new RollupVisualizerAnalyzer();
    private angularDist = new AngularDistAnalyzer();
    private genericDist = new GenericDistAnalyzer();

    constructor(
        private customAnalyzers?: TaskAnalyzer[],
        private reportStore?: TaskAnalyzeReportStore
    ) {}

    async analyze(spec: TaskDefinition, runtime: TaskRuntime): Promise<TaskAnalyzeResult | null> {
        if (spec.kind !== "build" || runtime.status !== "success") {
            return null;
        }

        this.latestDiagnosticsByTaskId.delete(spec.id);

        const diagnostics: TaskAnalyzeDiagnostic[] = [];
        const pushDiagnostic = (item: Omit<TaskAnalyzeDiagnostic, "createdAt">) => {
            diagnostics.push({ ...item, createdAt: Date.now() });
        };

        let detection: ProjectBuildDetection;
        try {
            detection = await detectProjectBuild(spec.projectRoot);
            pushDiagnostic({
                analyzer: "project-build-detector",
                status: "success",
                phase: "detect",
                message: "项目构建类型检测成功。",
                data: detection,
            });
        } catch (e: any) {
            pushDiagnostic({
                analyzer: "project-build-detector",
                status: "failed",
                phase: "detect",
                message: "项目构建类型检测失败。",
                error: e?.message ?? String(e),
                data: { projectRoot: spec.projectRoot },
            });
            this.storeDiagnostics(spec.id, runtime.runId, diagnostics);
            return null;
        }

        const plan = this.createPlan(detection);
        const steps: AnalyzerStep[] = [
            ...plan.primary.map((analyzer) => ({ analyzer, stage: "primary" as const })),
            ...(this.customAnalyzers ?? []).map((analyzer) => ({ analyzer, stage: "custom" as const })),
            ...plan.fallback.map((analyzer) => ({ analyzer, stage: "fallback" as const })),
        ];

        if (steps.length === 0) {
            pushDiagnostic({
                analyzer: "task-analyzer-plan",
                status: "skipped",
                phase: "supports",
                message: `当前构建类型 ${detection.buildTool} 暂无 analyzer plan。`,
                data: detection,
            });
        }

        let fallbackTracked = false;
        for (const step of steps) {
            if (step.stage === "fallback" && !fallbackTracked) {
                fallbackTracked = true;
                pushDiagnostic({
                    analyzer: step.analyzer.name,
                    status: "success",
                    phase: "fallback",
                    message: "进入 fallback analyzer 阶段。",
                    data: { buildTool: detection.buildTool },
                });
            }

            const report = await this.tryAnalyze(step.analyzer, spec, runtime, detection, diagnostics);
            if (!report) continue;

            report.diagnostics = diagnostics;
            await this.persistReport(report, diagnostics);
            this.reportsByRunId.set(runtime.runId, report);
            this.latestReportByTaskId.set(spec.id, report);
            this.storeDiagnostics(spec.id, runtime.runId, diagnostics);
            return report;
        }

        this.storeDiagnostics(spec.id, runtime.runId, diagnostics);
        return null;
    }

    private createPlan(detection: ProjectBuildDetection): AnalyzerPlan {
        switch (detection.buildTool) {
            case "angular-esbuild":
                return {
                    primary: [this.angularStats],
                    fallback: [this.angularDist],
                };

            case "angular-webpack":
                return {
                    primary: [this.angularStats],
                    fallback: [this.angularDist],
                };

            case "vite":
                return {
                    primary: [this.rollupVisualizer],
                    fallback: [this.genericDist],
                };

            case "vue-cli-webpack":
            case "webpack":
                return {
                    primary: [this.webpackStats],
                    fallback: [this.genericDist],
                };

            default:
                return {
                    primary: [],
                    fallback: [this.genericDist],
                };
        }
    }

    private async tryAnalyze(
        analyzer: TaskAnalyzer,
        spec: TaskDefinition,
        runtime: TaskRuntime,
        detection: ProjectBuildDetection,
        diagnostics: TaskAnalyzeDiagnostic[]
    ): Promise<TaskAnalyzeResult | null> {
        const ctx = { spec, runtime, detection };
        const pushDiagnostic = (item: Omit<TaskAnalyzeDiagnostic, "createdAt">) => {
            diagnostics.push({ ...item, createdAt: Date.now() });
        };
        const ctxWithDiagnostics = { ...ctx, diagnostics };

        let supported = false;
        try {
            supported = analyzer.supports(ctxWithDiagnostics);
        } catch (e: any) {
            pushDiagnostic({
                analyzer: analyzer.name,
                status: "failed",
                phase: "supports",
                message: "supports(ctx) 执行失败。",
                error: e?.message ?? String(e),
            });
            return null;
        }

        if (!supported) {
            pushDiagnostic({
                analyzer: analyzer.name,
                status: "skipped",
                phase: "supports",
                message: "supports(ctx) returned false.",
            });
            return null;
        }

        pushDiagnostic({
            analyzer: analyzer.name,
            status: "success",
            phase: "supports",
        });

        try {
            const report = await analyzer.analyze(ctxWithDiagnostics);
            pushDiagnostic({
                analyzer: analyzer.name,
                status: report ? "success" : "skipped",
                phase: "analyze",
                message: report ? undefined : "Analyzer returned null.",
            });
            return report;
        } catch (e: any) {
            // Keep fallback analyzers available even when a primary analyzer fails.
            pushDiagnostic({
                analyzer: analyzer.name,
                status: "failed",
                phase: "analyze",
                message: "analyze(ctx) 执行失败。",
                error: e?.message ?? String(e),
            });
            return null;
        }
    }

    private storeDiagnostics(taskId: string, runId: string, diagnostics: TaskAnalyzeDiagnostic[]) {
        this.diagnosticsByRunId.set(runId, diagnostics);
        this.latestDiagnosticsByTaskId.set(taskId, diagnostics);
    }

    private async persistReport(report: TaskAnalyzeResult, diagnostics: TaskAnalyzeDiagnostic[]) {
        if (!this.reportStore) return;
        try {
            await this.reportStore.save(report);
        } catch (e: any) {
            const message = e?.message ?? String(e);
            diagnostics.push({
                analyzer: "task-report-store",
                status: "failed",
                phase: "analyze",
                message: "构建分析报告持久化失败。",
                error: message,
                createdAt: Date.now(),
            });
            report.warnings = [
                ...(report.warnings ?? []),
                {
                    code: "task-report-store-save-failed",
                    message: "构建分析报告持久化失败，本次任务成功状态不受影响。",
                    data: { error: message },
                },
            ];
            report.diagnostics = diagnostics;
        }
    }

    async getReportByRunId(runId: string): Promise<TaskAnalyzeResult | null> {
        const memory = this.reportsByRunId.get(runId);
        if (memory) return memory;
        return await this.reportStore?.getByRunId(runId) ?? null;
    }

    async getLatestReportByTaskId(taskId: string): Promise<TaskAnalyzeResult | null> {
        const memory = this.latestReportByTaskId.get(taskId);
        if (memory) return memory;
        const list = await this.reportStore?.listByTaskId(taskId, 1) ?? [];
        return list[0] ?? null;
    }

    getDiagnosticsByRunId(runId: string): TaskAnalyzeDiagnostic[] {
        return this.diagnosticsByRunId.get(runId) ?? [];
    }

    getLatestDiagnosticsByTaskId(taskId: string): TaskAnalyzeDiagnostic[] {
        return this.latestDiagnosticsByTaskId.get(taskId) ?? [];
    }

    async listReportsByTaskId(taskId: string, limit = 20): Promise<TaskAnalyzeResult[]> {
        if (this.reportStore) return await this.reportStore.listByTaskId(taskId, limit);
        return this.memoryReports()
            .filter((report) => report.taskId === taskId)
            .sort((a, b) => b.createdAt - a.createdAt)
            .slice(0, limit);
    }

    async listReportsByProjectId(projectId: string, limit = 20): Promise<TaskAnalyzeResult[]> {
        if (this.reportStore) return await this.reportStore.listByProjectId(projectId, limit);
        return this.memoryReports()
            .filter((report) => report.projectId === projectId)
            .sort((a, b) => b.createdAt - a.createdAt)
            .slice(0, limit);
    }

    async listReportSummariesByTaskId(taskId: string, limit = 20): Promise<TaskAnalyzeReportSummary[]> {
        if (this.reportStore) return await this.reportStore.listSummaryByTaskId(taskId, limit);
        return this.summarizeReports(await this.listReportsByTaskId(taskId, limit));
    }

    async listReportSummariesByProjectId(projectId: string, limit = 20): Promise<TaskAnalyzeReportSummary[]> {
        if (this.reportStore) return await this.reportStore.listSummaryByProjectId(projectId, limit);
        return this.summarizeReports(await this.listReportsByProjectId(projectId, limit));
    }

    private memoryReports(): TaskAnalyzeResult[] {
        return [...this.reportsByRunId.values()];
    }

    private summarizeReports(reports: TaskAnalyzeResult[]): TaskAnalyzeReportSummary[] {
        return reports.map((report) => ({
            runId: report.runId,
            taskId: report.taskId,
            projectId: report.projectId,
            analyzer: report.analyzer,
            createdAt: report.createdAt,
            totalRawSize: report.summary.totalRawSize,
            totalGzipSize: report.summary.totalGzipSize,
            totalBrotliSize: report.summary.totalBrotliSize,
            jsRawSize: report.summary.jsRawSize,
            cssRawSize: report.summary.cssRawSize,
            assetRawSize: report.summary.assetRawSize,
            fileCount: report.summary.fileCount,
            durationMs: report.summary.durationMs,
        }));
    }
}
