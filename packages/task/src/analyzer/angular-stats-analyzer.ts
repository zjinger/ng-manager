import fs from "node:fs/promises";
import path from "node:path";
import { resolveAngularOutputPath } from "./angular-output-path";
import { scanDistAssets } from "./dist-scanner";
import { detectProjectBuild } from "./project-build-detector";
import type {
    TaskAnalyzeChunk,
    TaskAnalyzeContext,
    TaskAnalyzeDependency,
    TaskAnalyzeInsight,
    TaskAnalyzeModule,
    TaskAnalyzeResult,
    TaskAnalyzeStats,
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

async function resolveBuildOutputPath(projectRoot: string, isAngular: boolean): Promise<string> {
    if (isAngular) return (await resolveAngularOutputPath(projectRoot)).outputPath;
    const dist = path.resolve(projectRoot, "dist");
    if (await exists(dist)) return dist;
    return projectRoot;
}

function packageNameFromPath(inputPath: string): string | undefined {
    const normalized = inputPath.replace(/\\/g, "/");
    const marker = "node_modules/";
    const idx = normalized.lastIndexOf(marker);
    if (idx < 0) return undefined;
    const rest = normalized.slice(idx + marker.length);
    const parts = rest.split("/").filter(Boolean);
    if (parts.length === 0) return undefined;
    if (parts[0]!.startsWith("@") && parts.length > 1) return `${parts[0]}/${parts[1]}`;
    return parts[0];
}

function basenameNoQuery(filePath: string) {
    return path.basename(filePath.split("?")[0] ?? filePath);
}

function sumAssets(assets: TaskAssetInfo[]) {
    const totalRawSize = assets.reduce((sum, item) => sum + item.rawSize, 0);
    const totalGzipSize = assets.reduce((sum, item) => sum + (item.gzipSize ?? 0), 0);
    const jsAssets = assets.filter((item) => item.type === "js");
    const cssAssets = assets.filter((item) => item.type === "css");
    const otherAssets = assets.filter((item) => item.type !== "js" && item.type !== "css");
    const largest = assets[0];

    return {
        fileCount: assets.length,
        totalRawSize,
        totalGzipSize,
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
            ratio: item.ratio,
        })),
    };
}

function buildDependencies(modules: TaskAnalyzeModule[]): TaskAnalyzeDependency[] {
    const byName = new Map<string, { rawSize: number; moduleCount: number }>();
    let total = 0;

    for (const mod of modules) {
        total += mod.rawSize;
        if (!mod.packageName) continue;
        const cur = byName.get(mod.packageName) ?? { rawSize: 0, moduleCount: 0 };
        cur.rawSize += mod.rawSize;
        cur.moduleCount += 1;
        byName.set(mod.packageName, cur);
    }

    return [...byName.entries()]
        .map(([name, item]) => ({
            name,
            rawSize: item.rawSize,
            moduleCount: item.moduleCount,
            ratio: total > 0 ? item.rawSize / total : 0,
        }))
        .sort((a, b) => b.rawSize - a.rawSize);
}

function buildInsights(chunks: TaskAnalyzeChunk[], modules: TaskAnalyzeModule[], dependencies: TaskAnalyzeDependency[]): TaskAnalyzeInsight[] {
    const insights: TaskAnalyzeInsight[] = [];
    const largestChunk = chunks[0];
    const largestDep = dependencies[0];
    const largestModule = modules[0];

    if (largestChunk && largestChunk.rawSize > 500 * 1024) {
        insights.push({
            level: "warning",
            code: "large-chunk",
            message: `最大 chunk ${largestChunk.name} 超过 500KB，建议检查是否可拆分懒加载。`,
            data: largestChunk,
        });
    }

    if (largestDep && (largestDep.ratio ?? 0) > 0.35) {
        insights.push({
            level: "warning",
            code: "large-dependency",
            message: `第三方依赖 ${largestDep.name} 占模块体积较高，建议确认是否可按需引入。`,
            data: largestDep,
        });
    }

    if (largestModule && largestModule.rawSize > 200 * 1024) {
        insights.push({
            level: "info",
            code: "large-module",
            message: `最大模块为 ${largestModule.name}，可以优先查看该模块的引入路径。`,
            data: largestModule,
        });
    }

    return insights;
}

function parseEsbuildMetafile(statsPath: string, json: Record<string, any>): TaskAnalyzeStats {
    const outputs = isObject(json.outputs) ? json.outputs : {};
    const inputs = isObject(json.inputs) ? json.inputs : {};
    const moduleBytes = new Map<string, { rawSize: number; chunk?: string }>();

    const chunks: TaskAnalyzeChunk[] = Object.entries(outputs).map(([file, output]: [string, any]) => {
        const outputInputs = isObject(output?.inputs) ? output.inputs : {};
        for (const [inputName, inputMeta] of Object.entries(outputInputs) as Array<[string, any]>) {
            const bytes = Number(inputMeta?.bytesInOutput ?? inputMeta?.bytes ?? inputs[inputName]?.bytes ?? 0) || 0;
            const cur = moduleBytes.get(inputName) ?? { rawSize: 0, chunk: basenameNoQuery(file) };
            cur.rawSize += bytes;
            moduleBytes.set(inputName, cur);
        }

        return {
            name: basenameNoQuery(file),
            files: [file],
            rawSize: Number(output?.bytes ?? 0) || 0,
            entry: !!output?.entryPoint,
            initial: !!output?.entryPoint,
        };
    }).sort((a, b) => b.rawSize - a.rawSize);

    for (const [inputName, inputMeta] of Object.entries(inputs) as Array<[string, any]>) {
        if (moduleBytes.has(inputName)) continue;
        moduleBytes.set(inputName, { rawSize: Number(inputMeta?.bytes ?? 0) || 0 });
    }

    const modules = [...moduleBytes.entries()]
        .map(([inputPath, item]) => ({
            name: basenameNoQuery(inputPath),
            path: inputPath,
            rawSize: item.rawSize,
            packageName: packageNameFromPath(inputPath),
            chunk: item.chunk,
        }))
        .filter((item) => item.rawSize > 0)
        .sort((a, b) => b.rawSize - a.rawSize);
    const dependencies = buildDependencies(modules);

    return {
        statsPath,
        format: "esbuild-metafile",
        chunks,
        modules,
        dependencies,
        insights: buildInsights(chunks, modules, dependencies),
    };
}

function parseWebpackStats(statsPath: string, json: Record<string, any>): TaskAnalyzeStats {
    const rawAssets = Array.isArray(json.assets) ? json.assets : [];
    const rawChunks = Array.isArray(json.chunks) ? json.chunks : [];
    const rawModules = Array.isArray(json.modules) ? json.modules : [];

    const chunks: TaskAnalyzeChunk[] = rawChunks.length > 0
        ? rawChunks.map((chunk: any) => ({
            name: Array.isArray(chunk.names) && chunk.names.length > 0 ? chunk.names.join(", ") : String(chunk.id ?? "chunk"),
            files: Array.isArray(chunk.files) ? chunk.files.map(String) : [],
            rawSize: Number(chunk.size ?? 0) || 0,
            initial: typeof chunk.initial === "boolean" ? chunk.initial : undefined,
            entry: typeof chunk.entry === "boolean" ? chunk.entry : undefined,
        }))
        : rawAssets.map((asset: any) => ({
            name: String(asset.name ?? "asset"),
            files: [String(asset.name ?? "")],
            rawSize: Number(asset.size ?? 0) || 0,
        }));

    const modules: TaskAnalyzeModule[] = rawModules
        .map((mod: any) => {
            const modName = String(mod.nameForCondition ?? mod.name ?? mod.identifier ?? "module");
            return {
                name: basenameNoQuery(modName),
                path: modName,
                rawSize: Number(mod.size ?? 0) || 0,
                packageName: packageNameFromPath(modName),
                chunk: Array.isArray(mod.chunks) ? mod.chunks.map(String).join(",") : undefined,
            };
        })
        .filter((item: TaskAnalyzeModule) => item.rawSize > 0)
        .sort((a: TaskAnalyzeModule, b: TaskAnalyzeModule) => b.rawSize - a.rawSize);
    const dependencies = buildDependencies(modules);

    return {
        statsPath,
        format: "webpack-stats",
        chunks: chunks.sort((a, b) => b.rawSize - a.rawSize),
        modules,
        dependencies,
        insights: buildInsights(chunks, modules, dependencies),
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
        const statsPath = await findStatsJson(outputPath) ?? await findStatsJson(path.resolve(ctx.spec.projectRoot, "dist")) ?? await findStatsJson(ctx.spec.projectRoot, 2);
        if (!statsPath) return null;

        const assets = await scanDistAssets(outputPath, { includeMap: false });
        const text = await fs.readFile(statsPath, "utf8");
        const stats = parseStats(statsPath, JSON.parse(text));
        if (!stats) return null;
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
            warnings: detection.buildTool === "angular-webpack"
                ? [{
                    code: "angular-webpack-stats",
                    message: "检测到 Angular webpack 构建链路，stats.json 将按 webpack-bundle-analyzer 兼容结构解析。",
                    data: detection,
                }]
                : undefined,
        };
    }
}
