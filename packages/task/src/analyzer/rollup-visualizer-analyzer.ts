import fs from "node:fs/promises";
import path from "node:path";
import { scanDistAssets } from "./dist-scanner";
import { buildChunkStrategyInsights } from "./insights/chunk-strategy-insights";
import { buildViteRollupInsights } from "./insights/vite-rollup-insights";
import { parseRollupVisualizerStats } from "./parsers/rollup-visualizer.parser";
import { detectProjectBuild } from "./project-build-detector";
import { detectAnalyzerProviderCapabilities } from "./providers/provider-capability";
import { summarizeAssets } from "./utils/asset-summary";
import type {
    TaskAnalyzeChunk,
    TaskAnalyzeContext,
    TaskAnalyzeDiagnostic,
    TaskAnalyzeResult,
    TaskAnalyzeStats,
    TaskAnalyzeWarning,
    TaskAssetInfo,
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

async function isDirectory(filePath: string) {
    try {
        return (await fs.stat(filePath)).isDirectory();
    } catch {
        return false;
    }
}

async function findVisualizerReport(projectRoot: string): Promise<string | null> {
    const candidates = [
        path.join(projectRoot, "dist", "stats.json"),
        path.join(projectRoot, "dist", "visualizer.json"),
        path.join(projectRoot, "dist", "bundle-stats.json"),
        path.join(projectRoot, "dist", ".vite", "stats.json"),
        path.join(projectRoot, "stats.json"),
    ];
    for (const candidate of candidates) {
        if (await exists(candidate)) return candidate;
    }
    return null;
}

async function cleanupVisualizerArtifact(statsPath: string): Promise<TaskAnalyzeWarning | null> {
    const normalized = statsPath.replace(/\\/g, "/").toLowerCase();
    const safeNames = [
        "/dist/stats.json",
        "/dist/visualizer.json",
        "/dist/bundle-stats.json",
        "/dist/.vite/stats.json",
    ];
    if (!safeNames.some((suffix) => normalized.endsWith(suffix))) return null;

    try {
        await fs.rm(statsPath, { force: true });
        return {
            code: "rollup-visualizer-artifact-cleaned",
            message: "已读取并清理 rollup visualizer 分析产物，避免进入生产部署。",
            data: { statsPath },
        };
    } catch (e: any) {
        return {
            code: "rollup-visualizer-artifact-cleanup-failed",
            message: "rollup visualizer 分析产物已读取，但清理失败。请在部署脚本中排除。",
            data: { statsPath, error: e?.message ?? String(e) },
        };
    }
}

async function resolveDistPath(projectRoot: string): Promise<string | null> {
    const dist = path.resolve(projectRoot, "dist");
    return await isDirectory(dist) ? dist : null;
}

function tryParseJson(text: string): any | null {
    try {
        return JSON.parse(text.replace(/^\uFEFF/, ""));
    } catch {
        return null;
    }
}

function pushDiagnostic(ctx: TaskAnalyzeContext, item: Omit<TaskAnalyzeDiagnostic, "createdAt">) {
    ctx.diagnostics?.push({ ...item, createdAt: Date.now() });
}

function chunksFromDistAssets(assets: TaskAssetInfo[]): TaskAnalyzeChunk[] {
    return assets
        .filter((asset) => asset.type === "js" || asset.type === "css")
        .map((asset) => ({
            name: asset.name,
            files: [asset.relativePath],
            rawSize: asset.rawSize,
            initial: asset.type === "css" || /^index-|^main-|^app-|^styles[-.]/i.test(asset.name),
            entry: /^index-|^main-|^app-/i.test(asset.name),
        }))
        .filter((chunk) => chunk.rawSize > 0)
        .sort((a, b) => b.rawSize - a.rawSize);
}

async function readVisualizerStats(statsPath: string): Promise<{ stats: TaskAnalyzeStats | null; topLevelKeys: string[] }> {
    const text = await fs.readFile(statsPath, "utf8");
    const json = statsPath.toLowerCase().endsWith(".json") ? tryParseJson(text) : null;
    const topLevelKeys = json && typeof json === "object" ? Object.keys(json) : [];
    return {
        stats: json ? parseRollupVisualizerStats(statsPath, json) : null,
        topLevelKeys,
    };
}

export class RollupVisualizerAnalyzer implements TaskAnalyzer {
    name = "rollup-plugin-visualizer";

    supports(ctx: TaskAnalyzeContext): boolean {
        return ctx.spec.kind === "build" && ctx.runtime.status === "success";
    }

    async analyze(ctx: TaskAnalyzeContext): Promise<TaskAnalyzeResult | null> {
        if (!this.supports(ctx)) return null;
        const detection = ctx.detection ?? await detectProjectBuild(ctx.spec.projectRoot);
        if (detection.buildTool !== "vite") return null;

        const capabilities = await detectAnalyzerProviderCapabilities({
            projectRoot: ctx.spec.projectRoot,
            detection,
        });
        const capability = capabilities.find((item) => item.provider === "rollup-visualizer");
        if (capability) {
            pushDiagnostic(ctx, {
                analyzer: this.name,
                status: capability.status === "available" ? "success" : "skipped",
                phase: "analyze",
                message: capabilityMessage(capability.status, capability.reason),
                data: capability,
            });
        }

        if (capability?.status !== "available") return null;

        const statsPath = await findVisualizerReport(ctx.spec.projectRoot);
        if (!statsPath) {
            pushDiagnostic(ctx, {
                analyzer: this.name,
                status: "skipped",
                phase: "analyze",
                message: "Provider capability 可用，但未找到可解析的 rollup visualizer JSON 产物。",
                data: capability,
            });
            return null;
        }

        const outputPath = await resolveDistPath(ctx.spec.projectRoot);
        if (!outputPath) {
            pushDiagnostic(ctx, {
                analyzer: this.name,
                status: "skipped",
                phase: "analyze",
                message: "未找到 dist 输出目录，跳过 rollup visualizer 产物分析以避免扫描 projectRoot。",
                data: { projectRoot: ctx.spec.projectRoot },
            });
            return null;
        }

        const assets = await scanDistAssets(outputPath, { includeMap: false });
        const { stats, topLevelKeys } = await readVisualizerStats(statsPath);
        if (!stats || stats.modules.length === 0) {
            pushDiagnostic(ctx, {
                analyzer: this.name,
                status: "skipped",
                phase: "parse",
                message: "visualizer JSON 未解析出模块或依赖，可能不是 rollup-plugin-visualizer raw-data；将回退到通用 dist 分析。",
                data: { statsPath, topLevelKeys },
            });
            return null;
        }

        const totalModuleSize = stats.modules.reduce((sum, item) => sum + item.rawSize, 0);
        pushDiagnostic(ctx, {
            analyzer: this.name,
            status: "success",
            phase: "parse",
            message: "已解析 rollup-plugin-visualizer JSON 产物。",
            data: {
                statsPath,
                moduleCount: stats.modules.length,
                dependencyCount: stats.dependencies.length,
                totalModuleSize,
                topLevelKeys,
            },
        });
        const cleanupWarning = await cleanupVisualizerArtifact(statsPath);
        const assetsForReport = cleanupWarning?.code === "rollup-visualizer-artifact-cleaned"
            ? await scanDistAssets(outputPath, { includeMap: false })
            : assets;
        if (stats.chunks.length === 0) {
            stats.chunks = chunksFromDistAssets(assetsForReport);
            pushDiagnostic(ctx, {
                analyzer: this.name,
                status: stats.chunks.length > 0 ? "success" : "skipped",
                phase: "parse",
                message: stats.chunks.length > 0
                    ? "rollup visualizer raw-data 未提供 chunk tree，已使用 dist JS/CSS 产物补充 Chunk Top。"
                    : "rollup visualizer raw-data 未提供 chunk tree，且 dist 中未找到可用于 Chunk Top 的 JS/CSS 产物。",
                data: {
                    chunkCount: stats.chunks.length,
                    outputPath,
                },
            });
        }
        stats.insights = [
            ...stats.insights,
            ...buildChunkStrategyInsights({ chunks: stats.chunks, assets: assetsForReport }),
            ...buildViteRollupInsights({
                assets: assetsForReport,
                chunks: stats.chunks,
                dependencies: stats.dependencies,
            }),
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
            warnings: cleanupWarning ? [cleanupWarning] : undefined,
        };
    }
}

function capabilityMessage(status: string, reason?: string): string {
    if (status === "available") return "检测到 rollup-plugin-visualizer JSON/raw-data 产物，将优先使用 visualizer 分析。";
    if (reason === "html-only") return "检测到 rollup-plugin-visualizer HTML 产物，但当前仅解析 JSON/raw-data；将回退到通用 dist 分析。";
    if (status === "missing-artifact") return "已检测到 rollup-plugin-visualizer 依赖，但未找到 visualizer JSON/raw-data 产物。";
    if (status === "missing-dependency") return "未检测到 rollup-plugin-visualizer 依赖，将回退到通用 dist 分析。";
    return "rollup visualizer provider 当前不可用，将回退到通用 dist 分析。";
}
