import fs from "node:fs/promises";
import path from "node:path";
import { scanDistAssets } from "./dist-scanner";
import { detectProjectBuild } from "./project-build-detector";
import { summarizeAssets } from "./utils/asset-summary";
import { basenameNoQuery, packageNameFromPath } from "./utils/module-path";
import type {
    TaskAnalyzeContext,
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

async function findVisualizerReport(projectRoot: string): Promise<string | null> {
    const candidates = [
        path.join(projectRoot, "dist", "stats.json"),
        path.join(projectRoot, "dist", "stats.html"),
        path.join(projectRoot, "stats.json"),
        path.join(projectRoot, "stats.html"),
    ];
    for (const candidate of candidates) {
        if (await exists(candidate)) return candidate;
    }
    return null;
}

async function resolveDistPath(projectRoot: string) {
    const dist = path.resolve(projectRoot, "dist");
    if (await exists(dist)) return dist;
    return projectRoot;
}

function tryParseJson(text: string): any | null {
    try {
        return JSON.parse(text);
    } catch {
        return null;
    }
}

function collectModules(node: any, out: Array<{ name: string; rawSize: number; path?: string }>) {
    if (!node || typeof node !== "object") return;
    const name = String(node.name ?? node.label ?? node.uid ?? "");
    const size = Number(node.value ?? node.size ?? node.statSize ?? 0) || 0;
    if (name && size > 0) out.push({ name: basenameNoQuery(name), path: name, rawSize: size });
    const children = Array.isArray(node.children) ? node.children : Array.isArray(node.groups) ? node.groups : [];
    for (const child of children) collectModules(child, out);
}

async function parseVisualizerStats(statsPath: string): Promise<TaskAnalyzeStats> {
    const text = await fs.readFile(statsPath, "utf8");
    const json = statsPath.toLowerCase().endsWith(".json") ? tryParseJson(text) : null;
    const modules: Array<{ name: string; rawSize: number; path?: string; packageName?: string }> = [];

    if (json) {
        collectModules(json, modules);
        if (Array.isArray(json.nodes)) {
            for (const item of json.nodes) collectModules(item, modules);
        }
    }

    const normalizedModules = modules
        .map((item) => ({
            ...item,
            packageName: packageNameFromPath(item.path ?? item.name),
        }))
        .sort((a, b) => b.rawSize - a.rawSize);
    const total = normalizedModules.reduce((sum, item) => sum + item.rawSize, 0);
    const dependencies = [...normalizedModules.reduce((map, item) => {
        if (!item.packageName) return map;
        const cur = map.get(item.packageName) ?? { rawSize: 0, moduleCount: 0 };
        cur.rawSize += item.rawSize;
        cur.moduleCount += 1;
        map.set(item.packageName, cur);
        return map;
    }, new Map<string, { rawSize: number; moduleCount: number }>()).entries()]
        .map(([name, item]) => ({
            name,
            rawSize: item.rawSize,
            moduleCount: item.moduleCount,
            ratio: total > 0 ? item.rawSize / total : 0,
        }))
        .sort((a, b) => b.rawSize - a.rawSize);

    return {
        statsPath,
        format: "rollup-visualizer",
        chunks: [],
        modules: normalizedModules,
        dependencies,
        insights: [{
            level: "info",
            code: "rollup-visualizer-report",
            category: "diagnostic",
            message: statsPath.toLowerCase().endsWith(".html")
                ? "已找到 rollup-plugin-visualizer HTML 报告；模块明细请打开该报告查看。"
                : "已读取 rollup-plugin-visualizer JSON 报告。",
            data: { statsPath },
        }],
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

        const statsPath = await findVisualizerReport(ctx.spec.projectRoot);
        if (!statsPath) return null;

        const outputPath = await resolveDistPath(ctx.spec.projectRoot);
        const assets = await scanDistAssets(outputPath, { includeMap: false });
        const stats = await parseVisualizerStats(statsPath);

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
