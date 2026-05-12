import type {
    TaskAnalyzeContext,
    TaskAnalyzeResult,
    TaskAnalyzer,
} from "./task-analyzer.types";
import { resolveAngularOutputPath } from "./angular-output-path";
import { scanDistAssets } from "./dist-scanner";
import { buildAngularBudgetInsights } from "./insights/angular-budget-insights";
import { buildAngularBuildInsights } from "./insights/angular-build-insights";
import { buildDeploymentRiskInsights } from "./insights/deployment-risk-insights";
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
        const allAssets = await scanDistAssets(output.outputPath, { includeMap: true });
        const assets = allAssets.filter((asset) => asset.type !== "map");
        const summary = summarizeAssets(assets);
        const insights = [
            ...buildAngularBuildInsights(ctx.detection),
            ...buildDeploymentRiskInsights({ assets: allAssets }),
            ...(await buildAngularBudgetInsights({
                projectRoot: ctx.spec.projectRoot,
                summary,
                assets,
            })),
        ];

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
            stats: insights.length > 0
                ? {
                    statsPath: output.outputPath,
                    format: "unknown",
                    chunks: [],
                    modules: [],
                    dependencies: [],
                    insights,
                }
                : undefined,
        };
    }
}
