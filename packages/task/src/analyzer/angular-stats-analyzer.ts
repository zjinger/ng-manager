import fs from "node:fs/promises";
import path from "node:path";
import { resolveAngularOutputPath } from "./angular-output-path";
import { buildAngularBudgetInsights } from "./insights/angular-budget-insights";
import { scanDistAssets } from "./dist-scanner";
import { buildAngularBuildInsights } from "./insights/angular-build-insights";
import { buildDeploymentRiskInsights } from "./insights/deployment-risk-insights";
import { detectProjectBuild } from "./project-build-detector";
import { StatsJsonAnalyzer } from "./stats-json-analyzer";
import { summarizeAssets } from "./utils/asset-summary";
import type {
    TaskAnalyzeContext,
    TaskAnalyzeResult,
    TaskAnalyzeWarning,
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
    private statsJsonAnalyzer = new StatsJsonAnalyzer();

    supports(ctx: TaskAnalyzeContext): boolean {
        if (ctx.spec.kind !== "build" || ctx.runtime.status !== "success") return false;
        if (!ctx.detection) return true;
        return ctx.detection.framework === "angular";
    }

    async analyze(ctx: TaskAnalyzeContext): Promise<TaskAnalyzeResult | null> {
        if (!this.supports(ctx)) return null;

        const detection = ctx.detection ?? await detectProjectBuild(ctx.spec.projectRoot);
        const isAngular = detection.framework === "angular";
        if (!isAngular) return null;

        const outputPath = await resolveBuildOutputPath(ctx.spec.projectRoot, isAngular);
        const statsPath = await findStatsJsonCandidates(ctx.spec.projectRoot, outputPath);
        if (!statsPath) return null;

        const parsed = await this.statsJsonAnalyzer.analyze(statsPath);
        if (ctx.diagnostics && parsed.diagnostics.length > 0) {
            ctx.diagnostics.push(...parsed.diagnostics);
        }
        const stats = parsed.stats;
        if (!stats) return null;
        const cleanupWarning = await cleanupStatsJson(statsPath);
        const allAssets = await scanDistAssets(outputPath, { includeMap: true });
        const assets = allAssets.filter((asset) => asset.type !== "map");

        const summary = summarizeAssets(assets);
        stats.insights = [
            ...stats.insights,
            ...buildAngularBuildInsights(detection),
            ...buildDeploymentRiskInsights({ assets: allAssets, chunks: stats.chunks }),
            ...(await buildAngularBudgetInsights({
                projectRoot: ctx.spec.projectRoot,
                summary,
                assets,
                chunks: stats.chunks,
            })),
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
        return {
            runId: ctx.runtime.runId,
            taskId: ctx.runtime.taskId,
            projectId: ctx.runtime.projectId,
            analyzer: "angular-official-stats-json",
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
