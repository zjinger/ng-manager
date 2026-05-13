import type { TaskAnalyzeDependency, TaskAnalyzeInsight, TaskAnalyzeModule } from "../task-analyzer.types";

const KB = 1024;
const MB = 1024 * KB;

export function buildDependencies(modules: TaskAnalyzeModule[]): TaskAnalyzeDependency[] {
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

function formatSize(bytes: number): string {
    if (bytes >= MB) return `${(bytes / MB).toFixed(2)} MB`;
    if (bytes >= KB) return `${(bytes / KB).toFixed(1)} KB`;
    return `${bytes} B`;
}

function dependencyFamily(name: string): string | undefined {
    const normalized = name.toLowerCase();
    const families: Array<[RegExp, string, string]> = [
        [/^(ant-design-vue|antd|@ant-design\/)/, "Ant Design", "建议检查组件按需引入、图标按需引入和主题样式裁剪。"],
        [/^(echarts|zrender)/, "ECharts", "建议按需注册图表、组件和渲染器，避免一次性引入完整图表库。"],
        [/^(moment|moment-timezone)$/, "Moment", "建议评估 dayjs/date-fns 或裁剪 locale/timezone 数据。"],
        [/^(lodash|lodash-es)$/, "Lodash", "建议使用按函数引入或确认 tree-shaking 是否生效。"],
        [/^(pdfjs-dist|vue-pdf|vue-pdf-next|pdfmake)/, "PDF", "建议评估是否可按路由懒加载 PDF 相关能力。"],
        [/^(exceljs|xlsx|file-saver)/, "Office/Export", "建议评估导入导出能力是否可按功能懒加载。"],
        [/^(monaco-editor|codemirror|@codemirror\/)/, "Editor", "建议将编辑器能力拆到独立路由或异步组件。"],
        [/^(leaflet|mapbox-gl|ol|cesium)/, "Map", "建议将地图能力拆到业务页面懒加载，并检查插件和样式体积。"],
        [/^(@?vue|vue-router|pinia)/, "Vue Runtime", "框架运行时代码通常不可完全移除，但可检查重复版本和异常放大。"],
        [/^(@angular|rxjs|zone\.js)/, "Angular Runtime", "框架运行时代码通常不可完全移除，但可检查重复版本和异常放大。"],
    ];

    const match = families.find(([pattern]) => pattern.test(normalized));
    return match ? `${match[1]}：${match[2]}` : undefined;
}

export function buildDependencyQualityInsights(
    modules: TaskAnalyzeModule[],
    dependencies: TaskAnalyzeDependency[]
): TaskAnalyzeInsight[] {
    const insights: TaskAnalyzeInsight[] = [];
    if (dependencies.length === 0 || modules.length === 0) return insights;

    const totalModuleSize = modules.reduce((sum, mod) => sum + mod.rawSize, 0);
    const thirdPartyModules = modules.filter((mod) => mod.packageName);
    const thirdPartySize = thirdPartyModules.reduce((sum, mod) => sum + mod.rawSize, 0);
    const thirdPartyRatio = totalModuleSize > 0 ? thirdPartySize / totalModuleSize : 0;
    const largeDependencies = dependencies
        .filter((dep) => dep.rawSize > 700 * KB)
        .sort((a, b) => b.rawSize - a.rawSize)
        .slice(0, 10);

    if (largeDependencies.length > 0) {
        insights.push({
            level: "warning",
            code: "dependency-large-packages",
            category: "optimization",
            message: `检测到 ${largeDependencies.length} 个大依赖，最大依赖 ${largeDependencies[0]!.name} 为 ${formatSize(largeDependencies[0]!.rawSize)}。`,
            data: {
                count: largeDependencies.length,
                top: largeDependencies,
            },
        });
    }

    const dominant = dependencies.find((dep) => (dep.ratio ?? 0) > 0.3 || dep.rawSize > 1.5 * MB);
    if (dominant) {
        insights.push({
            level: "warning",
            code: "dependency-dominant-package",
            category: "optimization",
            message: `依赖 ${dominant.name} 占模块体积 ${(dominant.ratio ?? 0) > 0 ? `${((dominant.ratio ?? 0) * 100).toFixed(1)}%` : "较高"}，建议优先确认是否可按需引入或懒加载。`,
            data: dominant,
        });
    }

    if (thirdPartyRatio > 0.65 && thirdPartySize > 500 * KB) {
        insights.push({
            level: "warning",
            code: "dependency-third-party-ratio-high",
            category: "optimization",
            message: `第三方依赖约占模块体积 ${(thirdPartyRatio * 100).toFixed(1)}%，建议优先从依赖拆分、按需引入和懒加载边界入手。`,
            data: {
                totalModuleSize,
                thirdPartySize,
                thirdPartyRatio,
                moduleCount: modules.length,
                thirdPartyModuleCount: thirdPartyModules.length,
                topDependencies: dependencies.slice(0, 10),
            },
        });
    }

    const familyHints = dependencies
        .map((dep) => ({ dep, hint: dependencyFamily(dep.name) }))
        .filter((item): item is { dep: TaskAnalyzeDependency; hint: string } => !!item.hint)
        .slice(0, 8);
    if (familyHints.length > 0) {
        insights.push({
            level: "info",
            code: "dependency-heavy-family",
            category: "optimization",
            message: `检测到常见重型依赖家族：${familyHints.map((item) => item.dep.name).join("、")}。`,
            data: {
                top: familyHints.map((item) => ({
                    ...item.dep,
                    hint: item.hint,
                })),
            },
        });
    }

    const splitCandidates = dependencies
        .filter((dep) => dep.rawSize > 300 * KB && dep.moduleCount > 5)
        .sort((a, b) => b.rawSize - a.rawSize)
        .slice(0, 10);
    if (splitCandidates.length > 0) {
        insights.push({
            level: "info",
            code: "dependency-split-candidates",
            category: "optimization",
            message: "部分依赖模块数和体积都较高，可优先评估路由级懒加载、功能级异步加载或构建拆包策略。",
            data: {
                count: splitCandidates.length,
                top: splitCandidates,
            },
        });
    }

    return insights;
}
