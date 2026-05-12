import path from "node:path";
import fs from "node:fs/promises";
import { scanDistAssets } from "./dist-scanner";
import { buildDeploymentRiskInsights } from "./insights/deployment-risk-insights";
import { summarizeAssets } from "./utils/asset-summary";
import type {
    TaskAnalyzeContext,
    TaskAnalyzeChunk,
    TaskAnalyzeResult,
    TaskAnalyzeStats,
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

async function resolveDistPath(projectRoot: string): Promise<string | null> {
    const candidates = [
        path.resolve(projectRoot, "dist"),
        path.resolve(projectRoot, "build"),
    ];

    for (const candidate of candidates) {
        if (await exists(candidate)) return candidate;
    }

    return null;
}

export class GenericDistAnalyzer implements TaskAnalyzer {
    name = "generic-dist";

    supports(ctx: TaskAnalyzeContext): boolean {
        if (ctx.spec.kind !== "build" || ctx.runtime.status !== "success") return false;
        if (ctx.detection?.framework === "angular") return false;
        const buildTool = ctx.detection?.buildTool;
        return buildTool === "vite"
            || buildTool === "webpack"
            || buildTool === "vue-cli-webpack"
            || buildTool === "unknown";
    }

    async analyze(ctx: TaskAnalyzeContext): Promise<TaskAnalyzeResult | null> {
        if (!this.supports(ctx)) return null;

        const outputPath = await resolveDistPath(ctx.spec.projectRoot);
        if (!outputPath) return null;

        const allAssets = await scanDistAssets(outputPath, { includeMap: true });
        const assets = allAssets.filter((asset) => asset.type !== "map");
        if (assets.length === 0) return null;

        const manifestStats = await readViteManifest(outputPath, assets);
        const stats: TaskAnalyzeStats = manifestStats ?? {
            statsPath: outputPath,
            format: "unknown",
            chunks: [],
            modules: [],
            dependencies: [],
            insights: [],
        };
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
                ...summarizeAssets(assets),
            },
            assets,
            stats,
        };
    }
}

async function readViteManifest(
    outputPath: string,
    assets: Array<{ relativePath: string; rawSize: number }>
): Promise<TaskAnalyzeStats | null> {
    const manifestPath = path.resolve(outputPath, ".vite", "manifest.json");
    if (!await exists(manifestPath)) return null;

    let json: Record<string, any>;
    try {
        json = JSON.parse(await fs.readFile(manifestPath, "utf8"));
    } catch {
        return null;
    }

    const assetSizeByPath = new Map(assets.map((asset) => [asset.relativePath.replace(/\\/g, "/"), asset.rawSize]));
    const chunks: TaskAnalyzeChunk[] = Object.entries(json)
        .map(([name, item]: [string, any]) => {
            const files = [
                item?.file,
                ...(Array.isArray(item?.css) ? item.css : []),
                ...(Array.isArray(item?.assets) ? item.assets : []),
            ].filter((file): file is string => typeof file === "string");
            const rawSize = files.reduce((sum, file) => sum + (assetSizeByPath.get(file.replace(/\\/g, "/")) ?? 0), 0);

            return {
                name: String(item?.name ?? item?.src ?? name),
                files,
                rawSize,
                entry: !!item?.isEntry,
                initial: !!item?.isEntry,
            };
        })
        .filter((chunk) => chunk.files.length > 0 || chunk.rawSize > 0)
        .sort((a, b) => b.rawSize - a.rawSize);

    return {
        statsPath: manifestPath,
        format: "vite-manifest",
        chunks,
        modules: [],
        dependencies: [],
        insights: [{
            level: "info",
            code: "vite-manifest",
            category: "diagnostic",
            message: "已读取 Vite manifest，用于识别入口和 chunk 关系。",
            data: { statsPath: manifestPath },
        }],
    };
}
