import type { TaskAnalyzeSummary, TaskAssetInfo } from "../task-analyzer.types";

export function summarizeAssets(assets: TaskAssetInfo[]): TaskAnalyzeSummary {
    const jsAssets = assets.filter((item) => item.type === "js");
    const cssAssets = assets.filter((item) => item.type === "css");
    const otherAssets = assets.filter((item) => item.type !== "js" && item.type !== "css");
    const largest = assets[0];

    return {
        fileCount: assets.length,
        totalRawSize: assets.reduce((sum, item) => sum + item.rawSize, 0),
        totalGzipSize: assets.reduce((sum, item) => sum + (item.gzipSize ?? 0), 0),
        totalBrotliSize: assets.reduce((sum, item) => sum + (item.brotliSize ?? 0), 0),
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
                brotliSize: largest.brotliSize,
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
