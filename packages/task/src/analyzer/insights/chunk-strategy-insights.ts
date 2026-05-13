import type { TaskAnalyzeChunk, TaskAnalyzeInsight, TaskAssetInfo } from "../task-analyzer.types";

const KB = 1024;
const MB = 1024 * KB;

function formatSize(bytes: number): string {
    if (bytes >= MB) return `${(bytes / MB).toFixed(2)} MB`;
    if (bytes >= KB) return `${(bytes / KB).toFixed(1)} KB`;
    return `${bytes} B`;
}

function chunkName(chunk: TaskAnalyzeChunk): string {
    return chunk.name || chunk.files[0] || "chunk";
}

function isInitial(chunk: TaskAnalyzeChunk): boolean {
    return chunk.initial === true || chunk.entry === true;
}

function isVendorLike(chunk: TaskAnalyzeChunk): boolean {
    return /(vendor|chunk-vendors|node_modules|common|shared)/i.test([chunk.name, ...chunk.files].join(" "));
}

function isCssAsset(asset: TaskAssetInfo): boolean {
    return asset.type === "css" || /\.css$/i.test(asset.name);
}

export function buildChunkStrategyInsights(input: {
    chunks?: TaskAnalyzeChunk[];
    assets?: TaskAssetInfo[];
}): TaskAnalyzeInsight[] {
    const chunks = (input.chunks ?? []).filter((chunk) => chunk.rawSize > 0).sort((a, b) => b.rawSize - a.rawSize);
    const assets = input.assets ?? [];
    const insights: TaskAnalyzeInsight[] = [];
    if (chunks.length === 0 && assets.length === 0) return insights;

    const initialChunks = chunks.filter(isInitial).sort((a, b) => b.rawSize - a.rawSize);
    const lazyChunks = chunks.filter((chunk) => !isInitial(chunk));
    const largestInitial = initialChunks[0];
    const initialTotal = initialChunks.reduce((sum, chunk) => sum + chunk.rawSize, 0);
    const hasVendorChunk = chunks.some(isVendorLike);

    if (largestInitial && largestInitial.rawSize > 800 * KB) {
        insights.push({
            level: "warning",
            code: "chunk-strategy-large-entry",
            category: "optimization",
            message: `入口 chunk ${chunkName(largestInitial)} 体积为 ${formatSize(largestInitial.rawSize)}，建议检查首屏依赖和路由级拆分。`,
            data: largestInitial,
        });
    }

    if (initialTotal > 1.5 * MB) {
        insights.push({
            level: "warning",
            code: "chunk-strategy-large-initial-total",
            category: "optimization",
            message: `初始加载 chunk 总体积为 ${formatSize(initialTotal)}，建议减少首屏同步依赖或拆分非首屏功能。`,
            data: {
                total: initialTotal,
                count: initialChunks.length,
                top: initialChunks.slice(0, 10),
            },
        });
    }

    if (chunks.length > 0 && lazyChunks.length === 0 && (initialTotal > 500 * KB || (chunks[0]?.rawSize ?? 0) > 500 * KB)) {
        insights.push({
            level: "warning",
            code: "chunk-strategy-no-lazy",
            category: "optimization",
            message: "未检测到明显 lazy chunk，建议检查路由、弹窗、报表、地图等非首屏功能是否可异步加载。",
            data: {
                chunkCount: chunks.length,
                initialChunkCount: initialChunks.length,
                largestChunk: chunks[0],
            },
        });
    }

    if (!hasVendorChunk && chunks.some((chunk) => chunk.rawSize > MB)) {
        insights.push({
            level: "info",
            code: "chunk-strategy-vendor-not-split",
            category: "optimization",
            message: "未检测到明显 vendor/shared chunk；如大 chunk 中包含稳定第三方依赖，可评估 vendor 拆分策略。",
            data: {
                largestChunk: chunks[0],
                top: chunks.slice(0, 10),
            },
        });
    }

    const cssAssets = assets.filter(isCssAsset).sort((a, b) => b.rawSize - a.rawSize);
    const totalCssSize = cssAssets.reduce((sum, asset) => sum + asset.rawSize, 0);
    if (totalCssSize > 350 * KB || (cssAssets[0]?.rawSize ?? 0) > 220 * KB) {
        insights.push({
            level: "warning",
            code: "chunk-strategy-large-css",
            category: "optimization",
            message: `CSS 体积集中偏大，总计 ${formatSize(totalCssSize)}，建议检查全局样式、组件库样式和主题样式裁剪。`,
            data: {
                totalCssSize,
                top: cssAssets.slice(0, 10),
            },
        });
    }

    if (chunks.length > 0 && chunks.length <= 2 && chunks[0]!.rawSize > 700 * KB) {
        insights.push({
            level: "info",
            code: "chunk-strategy-too-few",
            category: "optimization",
            message: `当前仅检测到 ${chunks.length} 个 chunk，且最大 chunk 较大，建议评估是否缺少业务拆包。`,
            data: {
                chunkCount: chunks.length,
                top: chunks.slice(0, 10),
            },
        });
    }

    if (chunks.length > 80) {
        const tinyChunks = chunks.filter((chunk) => chunk.rawSize < 10 * KB);
        insights.push({
            level: "info",
            code: "chunk-strategy-too-many",
            category: "optimization",
            message: `当前检测到 ${chunks.length} 个 chunk，数量偏多，建议关注请求数、预加载策略和缓存命中。`,
            data: {
                chunkCount: chunks.length,
                tinyChunkCount: tinyChunks.length,
                top: chunks.slice(0, 10),
            },
        });
    }

    return insights;
}
