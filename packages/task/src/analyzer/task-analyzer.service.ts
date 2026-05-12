import type { TaskDefinition, TaskRuntime } from "../task.types";
import { AngularDistAnalyzer } from "./angular-dist-analyzer";
import { AngularStatsAnalyzer } from "./angular-stats-analyzer";
import { detectProjectBuild, type ProjectBuildDetection } from "./project-build-detector";
import { GenericDistAnalyzer } from "./generic-dist-analyzer";
import { RollupVisualizerAnalyzer } from "./rollup-visualizer-analyzer";
import { WebpackStatsAnalyzer } from "./webpack-stats-analyzer";
import type { TaskAnalyzeDiagnostic, TaskAnalyzeResult, TaskAnalyzer } from "./task-analyzer.types";

interface AnalyzerPlan {
    primary: TaskAnalyzer[];
    fallback: TaskAnalyzer[];
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

    constructor(private customAnalyzers?: TaskAnalyzer[]) {}

    async analyze(spec: TaskDefinition, runtime: TaskRuntime): Promise<TaskAnalyzeResult | null> {
        if (spec.kind !== "build" || runtime.status !== "success") {
            return null;
        }

        this.latestReportByTaskId.delete(spec.id);
        this.latestDiagnosticsByTaskId.delete(spec.id);

        const detection = await detectProjectBuild(spec.projectRoot);
        const plan = this.createPlan(detection);
        const analyzers = [
            ...plan.primary,
            ...(this.customAnalyzers ?? []),
            ...plan.fallback,
        ];
        const diagnostics: TaskAnalyzeDiagnostic[] = [];

        if (analyzers.length === 0) {
            diagnostics.push({
                analyzer: "task-analyzer-plan",
                status: "skipped",
                phase: "supports",
                message: `当前构建类型 ${detection.buildTool} 暂无 analyzer plan。`,
                data: detection,
            });
        }

        for (const analyzer of analyzers) {
            const report = await this.tryAnalyze(analyzer, spec, runtime, detection, diagnostics);
            if (!report) continue;

            report.diagnostics = diagnostics;
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

        let supported = false;
        try {
            supported = analyzer.supports(ctx);
        } catch (e: any) {
            diagnostics.push({
                analyzer: analyzer.name,
                status: "failed",
                phase: "supports",
                message: e?.message ?? String(e),
            });
            return null;
        }

        if (!supported) {
            diagnostics.push({
                analyzer: analyzer.name,
                status: "skipped",
                phase: "supports",
                message: "supports(ctx) returned false.",
            });
            return null;
        }

        diagnostics.push({
            analyzer: analyzer.name,
            status: "supported",
            phase: "supports",
        });

        try {
            const report = await analyzer.analyze(ctx);
            diagnostics.push({
                analyzer: analyzer.name,
                status: report ? "succeeded" : "no-report",
                phase: "analyze",
                message: report ? undefined : "Analyzer returned null.",
            });
            return report;
        } catch (e: any) {
            // Keep fallback analyzers available even when a primary analyzer fails.
            diagnostics.push({
                analyzer: analyzer.name,
                status: "failed",
                phase: "analyze",
                message: e?.message ?? String(e),
            });
            return null;
        }
    }

    private storeDiagnostics(taskId: string, runId: string, diagnostics: TaskAnalyzeDiagnostic[]) {
        this.diagnosticsByRunId.set(runId, diagnostics);
        this.latestDiagnosticsByTaskId.set(taskId, diagnostics);
    }

    getReportByRunId(runId: string): TaskAnalyzeResult | null {
        return this.reportsByRunId.get(runId) ?? null;
    }

    getLatestReportByTaskId(taskId: string): TaskAnalyzeResult | null {
        return this.latestReportByTaskId.get(taskId) ?? null;
    }

    getDiagnosticsByRunId(runId: string): TaskAnalyzeDiagnostic[] {
        return this.diagnosticsByRunId.get(runId) ?? [];
    }

    getLatestDiagnosticsByTaskId(taskId: string): TaskAnalyzeDiagnostic[] {
        return this.latestDiagnosticsByTaskId.get(taskId) ?? [];
    }
}
