import type {
    TaskAnalyzeContext,
    TaskAnalyzeResult,
    TaskAnalyzer,
} from "./task-analyzer.types";
import { resolveAngularOutputPath } from "./angular-output-path";
import { scanDistAssets } from "./dist-scanner";
import { summarizeAssets } from "./utils/asset-summary";

export class AngularDistAnalyzer implements TaskAnalyzer {
    name = "angular-dist";

    supports(ctx: TaskAnalyzeContext): boolean {
        if (ctx.spec.kind !== "build" || ctx.runtime.status !== "success") return false;

        const detection = ctx.detection;
        // Compatibility for direct analyzer usage; TaskAnalyzerService normally provides detection.
        if (!detection) return true;

        return detection.framework === "angular";
    }

    async analyze(ctx: TaskAnalyzeContext): Promise<TaskAnalyzeResult | null> {
        if (!this.supports(ctx)) return null;

        const output = await resolveAngularOutputPath(ctx.spec.projectRoot);
        const assets = await scanDistAssets(output.outputPath, { includeMap: false });
        const summary = summarizeAssets(assets);

        return {
            runId: ctx.runtime.runId,
            taskId: ctx.runtime.taskId,
            projectId: ctx.runtime.projectId,
            analyzer: this.name,
            createdAt: Date.now(),
            summary: {
                outputPath: output.outputPath,
                durationMs: ctx.runtime.startedAt && ctx.runtime.stoppedAt
                    ? Math.max(0, ctx.runtime.stoppedAt - ctx.runtime.startedAt)
                    : undefined,
                ...summary,
            },
            assets,
        };
    }
}
