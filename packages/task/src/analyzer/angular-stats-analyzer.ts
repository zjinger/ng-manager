import fs from "node:fs/promises";
import path from "node:path";
import { resolveAngularOutputPath } from "./angular-output-path";
import { scanDistAssets } from "./dist-scanner";
import { buildAngularBuildInsights } from "./insights/angular-build-insights";
import { buildDeploymentRiskInsights } from "./insights/deployment-risk-insights";
import { parseEsbuildMetafile } from "./parsers/esbuild-metafile.parser";
import { parseWebpackStats } from "./parsers/webpack-stats.parser";
import { detectProjectBuild } from "./project-build-detector";
import type {
    TaskAnalyzeContext,
    TaskAnalyzeResult,
    TaskAnalyzeStats,
    TaskAnalyzeWarning,
    TaskAnalyzer,
    TaskAssetInfo,
} from "./task-analyzer.types";

function isObject(value: unknown): value is Record<string, any> {
    return typeof value === "object" && value !== null;
}

async function exists(filePath: string) {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
}

const ignoredStatsDirs = new Set(["node_modules", ".git", ".angular", ".vite", ".cache", "coverage"]);

async function findStatsJson(root: string, depth = 4): Promise<string | null> {
    const direct = path.join(root, "stats.json");
    if (await exists(direct)) return direct;
    if (depth <= 0) return null;

    let entries: Array<import("node:fs").Dirent>;
    try {
        entries = await fs.readdir(root, { withFileTypes: true });
    } catch {
        return null;
    }

    for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        if (ignoredStatsDirs.has(entry.name)) continue;
        const found = await findStatsJson(path.join(root, entry.name), depth - 1);
        if (found) return found;
    }
    return null;
}

async function findStatsJsonCandidates(projectRoot: string, outputPath: string): Promise<string | null> {
    const resolvedProjectRoot = path.resolve(projectRoot);
    const resolvedOutputPath = path.resolve(outputPath);
    const outputCandidate = resolvedOutputPath === resolvedProjectRoot
        ? await findStatsJson(resolvedOutputPath, 0)
        : await findStatsJson(resolvedOutputPath, 2);

    return outputCandidate
        ?? await findStatsJson(path.resolve(projectRoot, "dist"), 2)
        ?? await findStatsJson(path.resolve(projectRoot, "dist", "browser"), 1)
        ?? await findStatsJson(projectRoot, 0);
}

async function resolveBuildOutputPath(projectRoot: string, isAngular: boolean): Promise<string> {
    if (isAngular) return (await resolveAngularOutputPath(projectRoot)).outputPath;
    const dist = path.resolve(projectRoot, "dist");
    if (await exists(dist)) return dist;
    return projectRoot;
}

function sumAssets(assets: TaskAssetInfo[]) {
    const totalRawSize = assets.reduce((sum, item) => sum + item.rawSize, 0);
    const totalGzipSize = assets.reduce((sum, item) => sum + (item.gzipSize ?? 0), 0);
    const totalBrotliSize = assets.reduce((sum, item) => sum + (item.brotliSize ?? 0), 0);
    const jsAssets = assets.filter((item) => item.type === "js");
    const cssAssets = assets.filter((item) => item.type === "css");
    const otherAssets = assets.filter((item) => item.type !== "js" && item.type !== "css");
    const largest = assets[0];

    return {
        fileCount: assets.length,
        totalRawSize,
        totalGzipSize,
        totalBrotliSize,
        jsRawSize: jsAssets.reduce((sum, item) => sum + item.rawSize, 0),
        cssRawSize: cssAssets.reduce((sum, item) => sum + item.rawSize, 0),
        assetRawSize: otherAssets.reduce((sum, item) => sum + item.rawSize, 0),
        jsFileCount: jsAssets.length,
        cssFileCount: cssAssets.length,
        assetFileCount: otherAssets.length,
        largestFile: largest
            ? {
                name: largest.relativePath,
                rawSize: largest.rawSize,
                gzipSize: largest.gzipSize,
            }
            : undefined,
        topAssets: assets.slice(0, 10).map((item) => ({
            name: item.name,
            relativePath: item.relativePath,
            type: item.type,
            rawSize: item.rawSize,
            gzipSize: item.gzipSize,
            brotliSize: item.brotliSize,
            ratio: item.ratio,
        })),
    };
}

function parseStats(statsPath: string, json: unknown): TaskAnalyzeStats | null {
    if (!isObject(json)) return null;
    if (isObject(json.inputs) && isObject(json.outputs)) return parseEsbuildMetafile(statsPath, json);
    if (Array.isArray(json.assets) || Array.isArray(json.chunks) || Array.isArray(json.modules)) {
        return parseWebpackStats(statsPath, json);
    }
    return null;
}

async function cleanupStatsJson(statsPath: string): Promise<TaskAnalyzeWarning | null> {
    if (path.basename(statsPath) !== "stats.json") return null;

    try {
        await fs.rm(statsPath, { force: true });
        return {
            code: "stats-json-cleaned",
            message: "已读取并清理 stats.json，避免分析文件进入部署产物。",
            data: { statsPath },
        };
    } catch (e: any) {
        return {
            code: "stats-json-cleanup-failed",
            message: "stats.json 已读取，但清理失败。请在部署脚本中排除 stats.json。",
            data: { statsPath, error: e?.message ?? String(e) },
        };
    }
}

export class AngularStatsAnalyzer implements TaskAnalyzer {
    name = "official-stats-json";

    supports(ctx: TaskAnalyzeContext): boolean {
        return ctx.spec.kind === "build" && ctx.runtime.status === "success";
    }

    async analyze(ctx: TaskAnalyzeContext): Promise<TaskAnalyzeResult | null> {
        if (!this.supports(ctx)) return null;

        const detection = ctx.detection ?? await detectProjectBuild(ctx.spec.projectRoot);
        const isAngular = detection.framework === "angular";
        const isWebpack = detection.buildTool === "webpack" || detection.buildTool === "vue-cli-webpack";
        if (!isAngular && !isWebpack) return null;

        const outputPath = await resolveBuildOutputPath(ctx.spec.projectRoot, isAngular);
        const statsPath = await findStatsJsonCandidates(ctx.spec.projectRoot, outputPath);
        if (!statsPath) return null;

        const text = await fs.readFile(statsPath, "utf8");
        const stats = parseStats(statsPath, JSON.parse(text));
        if (!stats) return null;
        const cleanupWarning = await cleanupStatsJson(statsPath);
        const allAssets = await scanDistAssets(outputPath, { includeMap: true });
        const assets = allAssets.filter((asset) => asset.type !== "map");

        stats.insights = [
            ...stats.insights,
            ...buildAngularBuildInsights(detection),
            ...buildDeploymentRiskInsights({ assets: allAssets, chunks: stats.chunks }),
        ];

        const warnings: TaskAnalyzeWarning[] = [
            ...(detection.buildTool === "angular-webpack"
                ? [{
                    code: "angular-webpack-stats",
                    message: "检测到 Angular webpack 构建链路，stats.json 将按 webpack-bundle-analyzer 兼容结构解析。",
                    data: detection,
                }]
                : []),
            ...(cleanupWarning ? [cleanupWarning] : []),
        ];
        const summary = sumAssets(assets);

        return {
            runId: ctx.runtime.runId,
            taskId: ctx.runtime.taskId,
            projectId: ctx.runtime.projectId,
            analyzer: isAngular ? "angular-official-stats-json" : "webpack-bundle-analyzer-stats",
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
            warnings: warnings.length > 0 ? warnings : undefined,
        };
    }
}
