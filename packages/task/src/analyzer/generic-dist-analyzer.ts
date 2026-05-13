import path from "node:path";
import fs from "node:fs/promises";
import { scanDistAssets } from "./dist-scanner";
import { buildChunkStrategyInsights } from "./insights/chunk-strategy-insights";
import { buildDeploymentRiskInsights } from "./insights/deployment-risk-insights";
import { buildViteRollupInsights } from "./insights/vite-rollup-insights";
import { detectAnalyzerProviderCapabilities } from "./providers/provider-capability";
import { summarizeAssets } from "./utils/asset-summary";
import type {
    TaskAnalyzeContext,
    TaskAnalyzeChunk,
    TaskAnalyzeDiagnostic,
    TaskAnalyzeInsight,
    TaskAnalyzeResult,
    TaskAnalyzeStats,
    TaskAnalyzeWarning,
    TaskAnalyzer,
    TaskAssetInfo,
} from "./task-analyzer.types";

async function exists(filePath: string) {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
}

async function isDirectory(filePath: string) {
    try {
        return (await fs.stat(filePath)).isDirectory();
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
        if (await isDirectory(candidate)) return candidate;
    }

    return null;
}

function pushDiagnostic(ctx: TaskAnalyzeContext, item: Omit<TaskAnalyzeDiagnostic, "createdAt">) {
    ctx.diagnostics?.push({ ...item, createdAt: Date.now() });
}

async function cleanupAutoViteManifest(manifestPath: string): Promise<TaskAnalyzeWarning> {
    try {
        await fs.rm(manifestPath, { force: true });
        const manifestDir = path.dirname(manifestPath);
        try {
            const remaining = await fs.readdir(manifestDir);
            if (remaining.length === 0) await fs.rmdir(manifestDir);
        } catch {
            // 清理空目录是附带动作，失败不影响 manifest 清理结果。
        }
        return {
            code: "vite-manifest-cleaned",
            message: "已读取并清理 ng-manager 自动生成的 Vite manifest，避免进入生产部署。",
            data: { manifestPath },
        };
    } catch (e: any) {
        return {
            code: "vite-manifest-cleanup-failed",
            message: "Vite manifest 已读取，但清理失败。请确认部署脚本是否需要排除 dist/.vite。",
            data: { manifestPath, error: e?.message ?? String(e) },
        };
    }
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
        if (!outputPath) {
            pushDiagnostic(ctx, {
                analyzer: this.name,
                status: "skipped",
                phase: "analyze",
                message: "未找到明确的通用构建输出目录，仅允许扫描 dist 或 build。",
                data: {
                    projectRoot: ctx.spec.projectRoot,
                    candidates: ["dist", "build"],
                },
            });
            return null;
        }

        pushDiagnostic(ctx, {
            analyzer: this.name,
            status: "success",
            phase: "analyze",
            message: "已选择通用构建输出目录。",
            data: { outputPath },
        });

        const allAssets = await scanDistAssets(outputPath, { includeMap: true });
        const assets = allAssets.filter((asset) => asset.type !== "map");
        if (assets.length === 0) {
            pushDiagnostic(ctx, {
                analyzer: this.name,
                status: "skipped",
                phase: "analyze",
                message: "构建输出目录存在，但未扫描到可分析的产物文件。",
                data: { outputPath },
            });
            return null;
        }

        const manifestResult = await readViteManifest(outputPath, assets, ctx);
        const manifestStats = manifestResult?.stats ?? null;
        const manifestCleanupWarning = manifestResult?.cleanupWarning;
        const allAssetsForReport = manifestCleanupWarning?.code === "vite-manifest-cleaned"
            ? await scanDistAssets(outputPath, { includeMap: true })
            : allAssets;
        const assetsForReport = allAssetsForReport.filter((asset) => asset.type !== "map");
        const stats: TaskAnalyzeStats = manifestStats ?? {
            statsPath: outputPath,
            format: "unknown",
            chunks: [],
            modules: [],
            dependencies: [],
            insights: [],
        };
        const providerInsights = await buildProviderSuggestionInsights(ctx, outputPath, assetsForReport, stats);
        stats.insights = [
            ...stats.insights,
            ...buildDeploymentRiskInsights({ assets: allAssetsForReport, chunks: stats.chunks }),
            ...buildChunkStrategyInsights({ chunks: stats.chunks, assets: assetsForReport }),
            ...providerInsights,
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
                ...summarizeAssets(assetsForReport),
            },
            assets: assetsForReport,
            stats,
            warnings: manifestCleanupWarning ? [manifestCleanupWarning] : undefined,
        };
    }
}

async function buildProviderSuggestionInsights(
    ctx: TaskAnalyzeContext,
    outputPath: string,
    assets: TaskAssetInfo[],
    stats: TaskAnalyzeStats
): Promise<TaskAnalyzeInsight[]> {
    if (ctx.detection?.buildTool !== "vite") return [];
    const capabilities = await detectAnalyzerProviderCapabilities({
        projectRoot: ctx.spec.projectRoot,
        detection: ctx.detection,
        outputPath,
    });
    const capability = capabilities.find((item) => item.provider === "rollup-visualizer");
    if (!capability) {
        return buildViteRollupInsights({
            assets,
            chunks: stats.chunks,
            dependencies: stats.dependencies,
        });
    }

    if (capability.status === "available") {
        return buildViteRollupInsights({
            assets,
            chunks: stats.chunks,
            dependencies: stats.dependencies,
        });
    }

    pushDiagnostic(ctx, {
        analyzer: "generic-dist",
        status: "success",
        phase: "fallback",
        message: "GenericDistAnalyzer 已作为 Vite fallback 生成基础构建分析报告。",
        data: { providerCapability: capability },
    });

    return buildViteRollupInsights({
        assets,
        chunks: stats.chunks,
        dependencies: stats.dependencies,
        visualizerCapability: capability,
    });
}

async function readViteManifest(
    outputPath: string,
    assets: Array<{ relativePath: string; rawSize: number }>,
    ctx: TaskAnalyzeContext
): Promise<{ stats: TaskAnalyzeStats; cleanupWarning?: TaskAnalyzeWarning } | null> {
    const manifestPath = path.resolve(outputPath, ".vite", "manifest.json");
    if (!await exists(manifestPath)) {
        pushDiagnostic(ctx, {
            analyzer: "generic-dist",
            status: "skipped",
            phase: "parse",
            message: "未检测到 Vite manifest，将仅生成基础 dist assets report。",
            data: { manifestPath },
        });
        return null;
    }

    let json: Record<string, any>;
    try {
        json = JSON.parse(await fs.readFile(manifestPath, "utf8"));
    } catch (e: any) {
        pushDiagnostic(ctx, {
            analyzer: "generic-dist",
            status: "failed",
            phase: "parse",
            message: "检测到 Vite manifest，但解析失败；将继续生成基础 dist assets report。",
            error: e?.message ?? String(e),
            data: { manifestPath },
        });
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

    pushDiagnostic(ctx, {
        analyzer: "generic-dist",
        status: "success",
        phase: "parse",
        message: "已解析 Vite manifest。",
        data: {
            manifestPath,
            chunkCount: chunks.length,
        },
    });

    const stats: TaskAnalyzeStats = {
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

    const cleanupWarning = ctx.detection?.buildTool === "vite" && ctx.analyzeHints?.addedViteManifest === true
        ? await cleanupAutoViteManifest(manifestPath)
        : undefined;

    return { stats, cleanupWarning };
}
