import type { TaskAnalyzeChunk, TaskAnalyzeInsight, TaskAssetInfo } from "../task-analyzer.types";

export function buildDeploymentRiskInsights(input: {
    assets: TaskAssetInfo[];
    chunks?: TaskAnalyzeChunk[];
}): TaskAnalyzeInsight[] {
    const insights: TaskAnalyzeInsight[] = [];
    const statsJson = input.assets.find((asset) => asset.name === "stats.json");
    const statsHtml = input.assets.find((asset) => asset.name === "stats.html");
    const maps = input.assets.filter((asset) => asset.type === "map");
    const largeAssets = input.assets
        .filter((asset) => asset.rawSize > 2 * 1024 * 1024)
        .sort((a, b) => b.rawSize - a.rawSize);
    const largeInitialChunks = (input.chunks ?? [])
        .filter((chunk) => chunk.initial && chunk.rawSize > 500 * 1024)
        .sort((a, b) => b.rawSize - a.rawSize);

    if (statsJson) {
        insights.push({
            level: "warning",
            code: "deployment-stats-json",
            message: "dist 中存在 stats.json，分析文件不应进入生产部署产物。",
            data: statsJson,
        });
    }

    if (statsHtml) {
        insights.push({
            level: "warning",
            code: "deployment-stats-html",
            message: "dist 中存在 stats.html，分析报告不应进入生产部署产物。",
            data: statsHtml,
        });
    }

    if (maps.length > 0) {
        insights.push({
            level: "warning",
            code: "deployment-source-maps",
            message: `dist 中存在 ${maps.length} 个 source map 文件，生产部署前请确认是否需要排除。`,
            data: { count: maps.length, top: maps.slice(0, 10) },
        });
    }

    if (largeAssets.length > 0) {
        insights.push({
            level: "warning",
            code: "deployment-large-asset",
            message: `dist 中存在 ${largeAssets.length} 个超过 2MB 的构建产物，可能影响首次下载或缓存刷新成本。`,
            data: { count: largeAssets.length, top: largeAssets.slice(0, 10) },
        });
    }

    if (largeInitialChunks.length > 1) {
        insights.push({
            level: "warning",
            code: "deployment-large-initial-chunk",
            message: `存在 ${largeInitialChunks.length} 个超过 500KB 的 initial chunk，建议检查懒加载拆分。`,
            data: { count: largeInitialChunks.length, top: largeInitialChunks.slice(0, 10) },
        });
    }

    return insights;
}
