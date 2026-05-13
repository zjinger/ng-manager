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

    if (largestChunk && largestChunk.rawSize > 1024 * 1024) {
        insights.push({
            level: "info",
            code: "large-chunk",
            message: `最大 chunk ${largestChunk.name} 超过 1MB，可结合首屏加载情况检查是否需要拆分。`,
            category: "optimization",
            data: largestChunk,
        });
    }

    if (largestDep && (largestDep.ratio ?? 0) > 0.45 && largestDep.rawSize > 700 * 1024) {
        insights.push({
            level: "info",
            code: "large-dependency",
            message: `第三方依赖 ${largestDep.name} 占模块体积较高，建议确认是否可按需引入。`,
            category: "optimization",
            data: largestDep,
        });
    }

    if (largestModule && largestModule.rawSize > 1024 * 1024) {
        insights.push({
            level: "info",
            code: "large-module",
            message: `最大模块为 ${largestModule.name}，如首屏体积异常可优先查看该模块的引入路径。`,
            category: "optimization",
            data: largestModule,
        });
    }

    return insights;
}
