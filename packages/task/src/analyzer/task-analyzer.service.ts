import type { TaskDefinition, TaskRuntime } from "../task.types";
import { AngularDistAnalyzer } from "./angular-dist-analyzer";
import { AngularStatsAnalyzer } from "./angular-stats-analyzer";
import { detectProjectBuild, type ProjectBuildDetection } from "./project-build-detector";
import { RollupVisualizerAnalyzer } from "./rollup-visualizer-analyzer";
import type { TaskAnalyzeResult, TaskAnalyzer } from "./task-analyzer.types";

interface AnalyzerPlan {
    detection: ProjectBuildDetection;
    primary: TaskAnalyzer[];
    fallback: TaskAnalyzer[];
}

export class TaskAnalyzerService {
    private reportsByRunId = new Map<string, TaskAnalyzeResult>();
    private latestReportByTaskId = new Map<string, TaskAnalyzeResult>();

    private angularStats = new AngularStatsAnalyzer();
    private rollupVisualizer = new RollupVisualizerAnalyzer();
    private angularDist = new AngularDistAnalyzer();

    constructor(private customAnalyzers?: TaskAnalyzer[]) {}

    async analyze(spec: TaskDefinition, runtime: TaskRuntime): Promise<TaskAnalyzeResult | null> {
        if (spec.kind !== "build" || runtime.status !== "success") {
            return null;
        }

        const detection = await detectProjectBuild(spec.projectRoot);
        const plan = this.createPlan(detection);
        const analyzers = this.customAnalyzers ?? [...plan.primary, ...plan.fallback];

        for (const analyzer of analyzers) {
            const report = await this.tryAnalyze(analyzer, spec, runtime, detection);
            if (!report) continue;

            this.reportsByRunId.set(runtime.runId, report);
            this.latestReportByTaskId.set(spec.id, report);
            return report;
        }

        return null;
    }

    private createPlan(detection: ProjectBuildDetection): AnalyzerPlan {
        switch (detection.buildTool) {
            case "angular-esbuild":
                return {
                    detection,
                    primary: [this.angularStats],
                    fallback: [this.angularDist],
                };

            case "angular-webpack":
                return {
                    detection,
                    primary: [this.angularStats],
                    fallback: [this.angularDist],
                };

            case "vite":
                return {
                    detection,
                    primary: [this.rollupVisualizer],
                    fallback: [],
                };

            case "vue-cli-webpack":
            case "webpack":
                return {
                    detection,
                    primary: [this.angularStats],
                    fallback: [],
                };

            default:
                return {
                    detection,
                    primary: [],
                    fallback: [],
                };
        }
    }

    private async tryAnalyze(
        analyzer: TaskAnalyzer,
        spec: TaskDefinition,
        runtime: TaskRuntime,
        detection: ProjectBuildDetection
    ): Promise<TaskAnalyzeResult | null> {
        const ctx = { spec, runtime, detection };

        if (!analyzer.supports(ctx)) return null;

        try {
            return await analyzer.analyze(ctx);
        } catch {
            return null;
        }
    }

    getReportByRunId(runId: string): TaskAnalyzeResult | null {
        return this.reportsByRunId.get(runId) ?? null;
    }

    getLatestReportByTaskId(taskId: string): TaskAnalyzeResult | null {
        return this.latestReportByTaskId.get(taskId) ?? null;
    }
}
