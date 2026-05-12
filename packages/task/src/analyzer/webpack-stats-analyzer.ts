import fs from "node:fs/promises";
import path from "node:path";
import { scanDistAssets } from "./dist-scanner";
import { buildDeploymentRiskInsights } from "./insights/deployment-risk-insights";
import { parseWebpackStats } from "./parsers/webpack-stats.parser";
import { detectProjectBuild } from "./project-build-detector";
import { summarizeAssets } from "./utils/asset-summary";
import type {
    TaskAnalyzeContext,
    TaskAnalyzeResult,
    TaskAnalyzer,
} from "./task-analyzer.types";

async function exists(filePath: string) {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
}

async function findStatsJson(projectRoot: string): Promise<string | null> {
    const candidates = [
        path.resolve(projectRoot, "dist", "stats.json"),
        path.resolve(projectRoot, "build", "stats.json"),
        path.resolve(projectRoot, "stats.json"),
    ];

    for (const candidate of candidates) {
        if (await exists(candidate)) return candidate;
    }

    return null;
}

async function resolveDistPath(projectRoot: string): Promise<string> {
    const candidates = [
        path.resolve(projectRoot, "dist"),
        path.resolve(projectRoot, "build"),
    ];

    for (const candidate of candidates) {
        if (await exists(candidate)) return candidate;
    }

    return projectRoot;
}

function isObject(value: unknown): value is Record<string, any> {
    return typeof value === "object" && value !== null;
}

export class WebpackStatsAnalyzer implements TaskAnalyzer {
    name = "webpack-stats-json";

    supports(ctx: TaskAnalyzeContext): boolean {
        if (ctx.spec.kind !== "build" || ctx.runtime.status !== "success") return false;
        const buildTool = ctx.detection?.buildTool;
        return buildTool === "webpack" || buildTool === "vue-cli-webpack";
    }

    async analyze(ctx: TaskAnalyzeContext): Promise<TaskAnalyzeResult | null> {
        if (!this.supports(ctx)) return null;

        const detection = ctx.detection ?? await detectProjectBuild(ctx.spec.projectRoot);
        if (detection.buildTool !== "webpack" && detection.buildTool !== "vue-cli-webpack") return null;

        const statsPath = await findStatsJson(ctx.spec.projectRoot);
        if (!statsPath) return null;

        const json = JSON.parse(await fs.readFile(statsPath, "utf8"));
        if (!isObject(json)) return null;

        const stats = parseWebpackStats(statsPath, json);
        const outputPath = await resolveDistPath(ctx.spec.projectRoot);
        const allAssets = await scanDistAssets(outputPath, { includeMap: true });
        const assets = allAssets.filter((asset) => asset.type !== "map");
        const summary = summarizeAssets(assets);
        stats.insights = [
            ...stats.insights,
            ...buildDeploymentRiskInsights({ assets: allAssets, chunks: stats.chunks }),
        ];

        return {
            runId: ctx.runtime.runId,
            taskId: ctx.runtime.taskId,
            projectId: ctx.runtime.projectId,
            analyzer: this.name,
            createdAt: Date.now(),
            summary: {
                outputPath,
                durationMs: ctx.runtime.startedAt && ctx.runtime.stoppedAt
                    ? Math.max(0, ctx.runtime.stoppedAt - ctx.runtime.startedAt)
                    : undefined,
                ...summary,
            },
            assets,
            stats,
        };
    }
}
