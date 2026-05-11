import type {
    TaskAnalyzeChunk,
    TaskAnalyzeDependency,
    TaskAnalyzeInsight,
    TaskAnalyzeModule,
} from "../task-analyzer.types";

export function buildSizeInsights(
    chunks: TaskAnalyzeChunk[],
    modules: TaskAnalyzeModule[],
    dependencies: TaskAnalyzeDependency[]
): TaskAnalyzeInsight[] {
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
