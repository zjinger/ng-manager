import type { TaskDefinition, TaskRuntime } from "../task.types";
import { AngularStatsAnalyzer } from "./angular-stats-analyzer";
import { RollupVisualizerAnalyzer } from "./rollup-visualizer-analyzer";
import type { TaskAnalyzer, TaskAnalyzeResult } from "./task-analyzer.types";

export class TaskAnalyzerService {
    private analyzers: TaskAnalyzer[] = [];
    private reportsByRunId = new Map<string, TaskAnalyzeResult>();
    private latestReportByTaskId = new Map<string, TaskAnalyzeResult>();

    constructor(analyzers?: TaskAnalyzer[]) {
        this.analyzers = analyzers ?? [new AngularStatsAnalyzer(), new RollupVisualizerAnalyzer()];
    }

    async analyze(spec: TaskDefinition, runtime: TaskRuntime): Promise<TaskAnalyzeResult | null> {
        const ctx = { spec, runtime };

        for (const analyzer of this.analyzers) {
            if (!analyzer.supports(ctx)) continue;

            const report = await analyzer.analyze(ctx);
            if (!report) continue;

            this.reportsByRunId.set(runtime.runId, report);
            this.latestReportByTaskId.set(spec.id, report);
            return report;
        }

        return null;
    }

    getReportByRunId(runId: string): TaskAnalyzeResult | null {
        return this.reportsByRunId.get(runId) ?? null;
    }

    getLatestReportByTaskId(taskId: string): TaskAnalyzeResult | null {
        return this.latestReportByTaskId.get(taskId) ?? null;
    }
}
