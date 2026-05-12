import fs from "node:fs/promises";
import path from "node:path";
import { scanDistAssets } from "./dist-scanner";
import { buildDeploymentRiskInsights } from "./insights/deployment-risk-insights";
import { detectProjectBuild } from "./project-build-detector";
import { StatsJsonAnalyzer } from "./stats-json-analyzer";
import { summarizeAssets } from "./utils/asset-summary";
import type {
    TaskAnalyzeContext,
    TaskAnalyzeDiagnostic,
    TaskAnalyzeStats,
    TaskAssetInfo,
    TaskAssetType,
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

async function isDirectory(filePath: string) {
    try {
        return (await fs.stat(filePath)).isDirectory();
    } catch {
        return false;
    }
}

async function isFile(filePath: string) {
    try {
        return (await fs.stat(filePath)).isFile();
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
        if (await isFile(candidate)) return candidate;
    }

    return null;
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

function pushDiagnostic(ctx: TaskAnalyzeContext, item: Omit<TaskAnalyzeDiagnostic, "createdAt">) {
    ctx.diagnostics?.push({ ...item, createdAt: Date.now() });
}

function assetTypeFromFile(fileName: string): TaskAssetType {
    const ext = path.extname(fileName).toLowerCase();
    if (ext === ".js" || ext === ".mjs" || ext === ".cjs") return "js";
    if (ext === ".css") return "css";
    if (ext === ".html") return "html";
    if ([".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".ico"].includes(ext)) return "image";
    if ([".woff", ".woff2", ".ttf", ".otf", ".eot"].includes(ext)) return "font";
    if (ext === ".map") return "map";
    return "asset";
}

function assetsFromWebpackStats(stats: TaskAnalyzeStats, statsPath: string): TaskAssetInfo[] {
    const assets: TaskAssetInfo[] = [];
    let total = 0;

    for (const chunk of stats.chunks) {
        const files = chunk.files.length > 0 ? chunk.files : [chunk.name];
        const sizePerFile = files.length > 0 ? Math.floor(chunk.rawSize / files.length) : chunk.rawSize;

        for (const file of files) {
            const rawSize = sizePerFile || chunk.rawSize || 0;
            if (rawSize <= 0) continue;
            total += rawSize;
            assets.push({
                name: path.basename(file),
                path: path.resolve(path.dirname(statsPath), file),
                relativePath: file.replace(/\\/g, "/"),
                ext: path.extname(file),
                type: assetTypeFromFile(file),
                rawSize,
            });
        }
    }

    for (const asset of assets) {
        asset.ratio = total > 0 ? asset.rawSize / total : 0;
    }

    return assets.sort((a, b) => b.rawSize - a.rawSize);
}

export class WebpackStatsAnalyzer implements TaskAnalyzer {
    name = "webpack-stats-json";
    private statsJsonAnalyzer = new StatsJsonAnalyzer();

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
        if (!statsPath) {
            pushDiagnostic(ctx, {
                analyzer: this.name,
                status: "skipped",
                phase: "analyze",
                message: "未在允许范围内找到 stats.json。",
                data: {
                    projectRoot: ctx.spec.projectRoot,
                    candidates: ["dist/stats.json", "build/stats.json", "stats.json"],
                },
            });
            return null;
        }

        pushDiagnostic(ctx, {
            analyzer: this.name,
            status: "success",
            phase: "analyze",
            message: "已找到 webpack stats.json。",
            data: { statsPath },
        });

        const parsed = await this.statsJsonAnalyzer.analyze(statsPath);
        if (ctx.diagnostics && parsed.diagnostics.length > 0) {
            ctx.diagnostics.push(...parsed.diagnostics);
        }
        const stats = parsed.stats;
        if (!stats || stats.format !== "webpack-stats") {
            pushDiagnostic(ctx, {
                analyzer: this.name,
                status: "skipped",
                phase: "parse",
                message: stats ? "stats.json 可解析，但格式不是 webpack-stats。" : "stats.json 解析失败。",
                data: { statsPath, format: stats?.format },
            });
            return null;
        }
        const outputPath = await resolveDistPath(ctx.spec.projectRoot);
        let allAssets: TaskAssetInfo[] = [];
        let assets: TaskAssetInfo[] = [];

        if (outputPath) {
            allAssets = await scanDistAssets(outputPath, { includeMap: true });
            assets = allAssets.filter((asset) => asset.type !== "map");
            pushDiagnostic(ctx, {
                analyzer: this.name,
                status: "success",
                phase: "analyze",
                message: "已选择 webpack 构建输出目录用于 assets 扫描。",
                data: { outputPath },
            });
        } else {
            assets = assetsFromWebpackStats(stats, statsPath);
            allAssets = assets;
            pushDiagnostic(ctx, {
                analyzer: this.name,
                status: "skipped",
                phase: "analyze",
                message: "未找到 dist/build，跳过输出目录扫描，仅基于 stats.json 生成报告。",
                data: {
                    projectRoot: ctx.spec.projectRoot,
                    candidates: ["dist", "build"],
                    statsPath,
                },
            });
        }

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
                outputPath: outputPath ?? undefined,
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
