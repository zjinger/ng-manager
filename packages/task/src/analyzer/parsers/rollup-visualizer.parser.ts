import { buildDependencies, buildDependencyQualityInsights } from "../insights/dependency-insights";
import { buildChunkStrategyInsights } from "../insights/chunk-strategy-insights";
import { buildSizeInsights } from "../insights/size-insights";
import type { TaskAnalyzeChunk, TaskAnalyzeModule, TaskAnalyzeStats } from "../task-analyzer.types";
import { basenameNoQuery, packageNameFromPath } from "../utils/module-path";

function isObject(value: unknown): value is Record<string, any> {
    return typeof value === "object" && value !== null;
}

function firstString(...values: unknown[]): string | undefined {
    for (const value of values) {
        if (typeof value === "string" && value.trim()) return value;
        if (typeof value === "number" && Number.isFinite(value)) return String(value);
    }
    return undefined;
}

function firstSize(...values: unknown[]): number {
    for (const value of values) {
        const size = Number(value);
        if (Number.isFinite(size) && size > 0) return size;
    }
    return 0;
}

function modulePathFromNode(node: Record<string, any>, fallback?: string): string | undefined {
    return firstString(
        node.path,
        node.file,
        node.moduleId,
        node.id,
        node.name,
        node.label,
        node.uid,
        fallback
    );
}

function moduleSizeFromNode(node: Record<string, any>): number {
    return firstSize(
        node.renderedLength,
        node.renderedSize,
        node.value,
        node.size,
        node.statSize
    );
}

function childrenOf(node: Record<string, any>): any[] {
    if (Array.isArray(node.children)) return node.children;
    if (Array.isArray(node.groups)) return node.groups;
    return [];
}

function hasExplicitModulePath(node: Record<string, any>, inputPath?: string): boolean {
    if (typeof node.path === "string" || typeof node.file === "string" || typeof node.moduleId === "string") return true;
    if (typeof node.id === "string" && node.id.trim()) return true;
    const normalized = inputPath?.replace(/\\/g, "/") ?? "";
    return normalized.includes("/") || normalized.includes("node_modules/") || /\.[cm]?[jt]sx?$|\.css$|\.vue$/.test(normalized);
}

function addModule(modules: Map<string, TaskAnalyzeModule>, inputPath: string | undefined, rawSize: number) {
    if (!inputPath || rawSize <= 0) return;
    const normalizedPath = inputPath.replace(/\\/g, "/");
    const key = normalizedPath;
    const current = modules.get(key);
    if (current) {
        current.rawSize += rawSize;
        return;
    }

    modules.set(key, {
        name: basenameNoQuery(normalizedPath),
        path: normalizedPath,
        rawSize,
        packageName: packageNameFromPath(normalizedPath),
    });
}

function collectTreeModules(node: unknown, modules: Map<string, TaskAnalyzeModule>) {
    if (!isObject(node)) return;

    const children = childrenOf(node);
    const inputPath = modulePathFromNode(node);
    if (children.length === 0 || hasExplicitModulePath(node, inputPath)) {
        addModule(modules, inputPath, moduleSizeFromNode(node));
    }

    for (const child of children) {
        collectTreeModules(child, modules);
    }
}

function subtreeSize(node: unknown): number {
    if (!isObject(node)) return 0;
    const own = moduleSizeFromNode(node);
    const childTotal = childrenOf(node).reduce((sum, child) => sum + subtreeSize(child), 0);
    return own > 0 ? own : childTotal;
}

function chunksFromTree(tree: unknown): TaskAnalyzeChunk[] {
    if (!isObject(tree)) return [];
    return childrenOf(tree)
        .map((child): TaskAnalyzeChunk | null => {
            if (!isObject(child)) return null;
            const name = firstString(child.name, child.label, child.uid, child.id, "chunk") ?? "chunk";
            const rawSize = subtreeSize(child);
            return {
                name: basenameNoQuery(name),
                files: [] as string[],
                rawSize,
            };
        })
        .filter((chunk): chunk is TaskAnalyzeChunk => !!chunk && chunk.rawSize > 0)
        .sort((a, b) => b.rawSize - a.rawSize);
}

function objectValues(value: unknown): any[] {
    if (Array.isArray(value)) return value;
    if (isObject(value)) return Object.values(value);
    return [];
}

function metaForPart(partKey: string, part: Record<string, any>, nodeMetas: Record<string, any>): Record<string, any> {
    const candidates = [
        part.metaUid,
        part.metaId,
        part.nodeMetaId,
        part.uid,
        part.id,
        partKey,
    ]
        .map((item) => firstString(item))
        .filter((item): item is string => !!item);

    for (const key of candidates) {
        const meta = nodeMetas[key];
        if (isObject(meta)) return meta;
    }

    return {};
}

function collectNodeParts(json: Record<string, any>, modules: Map<string, TaskAnalyzeModule>) {
    const nodeParts = isObject(json.nodeParts) ? json.nodeParts : undefined;
    const nodeMetas = isObject(json.nodeMetas) ? json.nodeMetas : {};
    if (!nodeParts) return;

    for (const [partKey, partValue] of Object.entries(nodeParts)) {
        if (!isObject(partValue)) continue;
        const meta = metaForPart(partKey, partValue, nodeMetas);
        const merged = { ...meta, ...partValue };
        const modulePath = modulePathFromNode(merged, modulePathFromNode(meta, partKey));
        addModule(modules, modulePath, moduleSizeFromNode(partValue));
    }

    for (const [metaKey, metaValue] of Object.entries(nodeMetas)) {
        if (!isObject(metaValue)) continue;
        addModule(modules, modulePathFromNode(metaValue, metaKey), moduleSizeFromNode(metaValue));
    }
}

function collectKnownShapes(json: Record<string, any>, modules: Map<string, TaskAnalyzeModule>) {
    collectTreeModules(json, modules);
    collectTreeModules(json.tree, modules);

    for (const node of objectValues(json.nodes)) {
        collectTreeModules(node, modules);
    }

    collectNodeParts(json, modules);
}

export function parseRollupVisualizerStats(
    statsPath: string,
    json: Record<string, any>
): TaskAnalyzeStats | null {
    const moduleMap = new Map<string, TaskAnalyzeModule>();
    collectKnownShapes(json, moduleMap);

    const modules = [...moduleMap.values()]
        .filter((item) => item.rawSize > 0)
        .sort((a, b) => b.rawSize - a.rawSize);
    if (modules.length === 0) return null;

    const dependencies = buildDependencies(modules);
    const chunks = chunksFromTree(json.tree ?? json);

    return {
        statsPath,
        format: "rollup-visualizer",
        chunks,
        modules,
        dependencies,
        insights: [{
            level: "info",
            code: "rollup-visualizer-report",
            category: "diagnostic",
            message: "已读取 rollup-plugin-visualizer JSON 报告。",
            data: { statsPath },
        },
        ...buildSizeInsights(chunks, modules, dependencies),
        ...buildDependencyQualityInsights(modules, dependencies),
        ...buildChunkStrategyInsights({ chunks })],
    };
}
