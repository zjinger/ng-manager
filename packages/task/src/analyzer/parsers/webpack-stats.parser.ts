import { buildDependencies } from "../insights/dependency-insights";
import { buildSizeInsights } from "../insights/size-insights";
import type { TaskAnalyzeChunk, TaskAnalyzeModule, TaskAnalyzeStats } from "../task-analyzer.types";
import { basenameNoQuery, packageNameFromPath } from "../utils/module-path";

function isObject(value: unknown): value is Record<string, any> {
    return typeof value === "object" && value !== null;
}

function moduleSize(mod: any): number {
    const sizes = isObject(mod?.sizes) ? mod.sizes : {};
    return Number(
        mod?.size
        ?? sizes.javascript
        ?? sizes.unknown
        ?? mod?.statSize
        ?? mod?.parsedSize
        ?? 0
    ) || 0;
}

function moduleName(mod: any): string {
    return String(
        mod?.nameForCondition
        ?? mod?.name
        ?? mod?.identifier
        ?? mod?.id
        ?? "module"
    );
}

function collectWebpackModulesFromNode(node: any, out: any[]) {
    if (!isObject(node)) return;

    const modules = Array.isArray(node.modules) ? node.modules : [];
    for (const mod of modules) {
        if (!isObject(mod)) continue;
        out.push(mod);
        collectWebpackModulesFromNode(mod, out);
    }

    const children = Array.isArray(node.children) ? node.children : [];
    for (const child of children) collectWebpackModulesFromNode(child, out);

    const chunks = Array.isArray(node.chunks) ? node.chunks : [];
    for (const chunk of chunks) collectWebpackModulesFromNode(chunk, out);
}

function collectWebpackModules(json: Record<string, any>): any[] {
    const modules: any[] = [];
    collectWebpackModulesFromNode(json, modules);
    const seen = new Set<string>();
    return modules.filter((mod) => {
        const key = String(mod?.identifier ?? mod?.nameForCondition ?? mod?.name ?? mod?.id ?? "");
        if (!key) return true;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

export function parseWebpackStats(statsPath: string, json: Record<string, any>): TaskAnalyzeStats {
    const rawAssets = Array.isArray(json.assets) ? json.assets : [];
    const rawChunks = Array.isArray(json.chunks) ? json.chunks : [];
    const rawModules = collectWebpackModules(json);

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
            const modName = moduleName(mod);
            return {
                name: basenameNoQuery(modName),
                path: modName,
                rawSize: moduleSize(mod),
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
        insights: buildSizeInsights(chunks, modules, dependencies),
    };
}
