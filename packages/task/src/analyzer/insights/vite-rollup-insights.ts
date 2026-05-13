import type {
    TaskAnalyzeChunk,
    TaskAnalyzeDependency,
    TaskAnalyzeInsight,
    TaskAssetInfo,
    TaskAnalyzerProviderCapability,
} from "../task-analyzer.types";

const KB = 1024;
const MB = 1024 * KB;

function formatSize(bytes: number): string {
    if (bytes >= MB) return `${(bytes / MB).toFixed(2)} MB`;
    if (bytes >= KB) return `${(bytes / KB).toFixed(1)} KB`;
    return `${bytes} B`;
}

function chunkText(chunk: TaskAnalyzeChunk): string {
    return chunk.name || chunk.files[0] || "chunk";
}

function isVendorName(name: string): boolean {
    return /(vendor|chunk-vendors|node_modules|common|shared)/i.test(name);
}

function isJsAsset(asset: TaskAssetInfo): boolean {
    return asset.type === "js" || /\.m?js$/i.test(asset.name);
}

function isCssAsset(asset: TaskAssetInfo): boolean {
    return asset.type === "css" || /\.css$/i.test(asset.name);
}

export function buildViteRollupInsights(input: {
    assets?: TaskAssetInfo[];
    chunks?: TaskAnalyzeChunk[];
    dependencies?: TaskAnalyzeDependency[];
    visualizerCapability?: TaskAnalyzerProviderCapability;
}): TaskAnalyzeInsight[] {
    const assets = input.assets ?? [];
    const chunks = input.chunks ?? [];
    const dependencies = input.dependencies ?? [];
    const insights: TaskAnalyzeInsight[] = [];

    const initialChunks = chunks
        .filter((chunk) => chunk.initial || chunk.entry)
        .sort((a, b) => b.rawSize - a.rawSize);
    const lazyChunks = chunks.filter((chunk) => !chunk.initial && !chunk.entry && chunk.rawSize > 0);
    const largestInitial = initialChunks[0];

    if (initialChunks.length === 1 && largestInitial && largestInitial.rawSize > 700 * KB) {
        insights.push({
            level: "warning",
            code: "vite-single-entry-large",
            category: "optimization",
            message: `Vite/Rollup 单入口 chunk ${chunkText(largestInitial)} 体积为 ${formatSize(largestInitial.rawSize)}，建议检查路由级 dynamic import 和首屏依赖。`,
            data: largestInitial,
        });
    }

    if (chunks.length > 0 && lazyChunks.length === 0 && largestInitial && largestInitial.rawSize > 500 * KB) {
        insights.push({
            level: "warning",
            code: "vite-no-lazy-chunk",
            category: "optimization",
            message: "未检测到 lazy chunk，当前构建可能缺少路由或功能级懒加载拆分。",
            data: {
                initialChunkCount: initialChunks.length,
                largestInitial,
            },
        });
    }

    const hasVendorChunk = chunks.some((chunk) => {
        const names = [chunk.name, ...chunk.files].filter(Boolean).join(" ");
        return isVendorName(names);
    });
    const jsAssets = assets.filter(isJsAsset).sort((a, b) => b.rawSize - a.rawSize);
    const hasVendorAsset = jsAssets.some((asset) => isVendorName(`${asset.name} ${asset.relativePath}`));
    const heavyDeps = dependencies
        .filter((dep) => dep.rawSize > 500 * KB || (dep.ratio ?? 0) > 0.25)
        .sort((a, b) => b.rawSize - a.rawSize)
        .slice(0, 10);

    if (!hasVendorChunk && !hasVendorAsset && (heavyDeps.length > 0 || (jsAssets[0]?.rawSize ?? 0) > MB)) {
        insights.push({
            level: "info",
            code: "vite-vendor-not-split",
            category: "optimization",
            message: "未检测到独立 vendor/shared 产物；如首屏 JS 偏大，可评估 manualChunks 拆分稳定第三方依赖。",
            data: {
                topDependencies: heavyDeps.slice(0, 5),
                largestJsAsset: jsAssets[0],
            },
        });
    }

    const cssAssets = assets.filter(isCssAsset).sort((a, b) => b.rawSize - a.rawSize);
    const totalCssSize = cssAssets.reduce((sum, asset) => sum + asset.rawSize, 0);
    if (totalCssSize > 300 * KB || (cssAssets[0]?.rawSize ?? 0) > 180 * KB) {
        insights.push({
            level: "warning",
            code: "vite-large-css",
            category: "optimization",
            message: `CSS 产物体积为 ${formatSize(totalCssSize)}，建议检查全量样式库、主题样式和未使用样式。`,
            data: {
                totalCssSize,
                top: cssAssets.slice(0, 10),
            },
        });
    }

    if (heavyDeps.length > 0) {
        insights.push({
            level: "warning",
            code: "vite-heavy-dependencies",
            category: "optimization",
            message: `检测到 ${heavyDeps.length} 个重型依赖，建议优先检查按需引入、替代实现或懒加载边界。`,
            data: {
                count: heavyDeps.length,
                top: heavyDeps,
            },
        });
    }

    const capability = input.visualizerCapability;
    if (capability && capability.status !== "available") {
        insights.push({
            level: "info",
            code: "vite-rollup-visualizer-suggestion",
            category: "diagnostic",
            message: visualizerSuggestionMessage(capability),
            data: capability,
        });
    }

    return insights;
}

function visualizerSuggestionMessage(capability: TaskAnalyzerProviderCapability): string {
    if (capability.reason === "html-only") {
        return "检测到 rollup-plugin-visualizer HTML 产物；如需在 ng-manager 中展示依赖级分析，请配置 raw-data JSON 输出。";
    }

    if (capability.status === "missing-artifact") {
        return "已检测到 rollup-plugin-visualizer 依赖，但未找到 visualizer JSON/raw-data；当前只能提供基础 Vite/Rollup 分析。";
    }

    return "未检测到 rollup-plugin-visualizer；当前只能提供基础 Vite/Rollup 分析，如需依赖级视图可安装并配置 raw-data JSON 输出。";
}
