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

const ANGULAR_BASELINE_DEPENDENCIES = new Set([
    "@angular/core",
    "@angular/common",
    "@angular/router",
    "@angular/forms",
    "@angular/animations",
    "@angular/platform-browser",
    "@angular/platform-browser-dynamic",
    "@angular/cdk",
    "rxjs",
    "zone.js",
    "tslib",
]);

interface DependencyFamilyHint {
    priority: number;
    family: string;
    message: string;
    minSize: number;
}

function isAngularProjectDependencySet(dependencies: TaskAnalyzeDependency[]): boolean {
    return dependencies.some((dep) => dep.name === "@angular/core" || dep.name === "@angular/common");
}

function isAngularBaselineDependency(name: string): boolean {
    return ANGULAR_BASELINE_DEPENDENCIES.has(name.toLowerCase());
}

function dependencyFamily(name: string): DependencyFamilyHint | undefined {
    const normalized = name.toLowerCase();
    const families: Array<[RegExp, DependencyFamilyHint]> = [
        [/^(pdfjs-dist|vue-pdf|vue-pdf-next|pdfmake)/, { priority: 1, family: "PDF", minSize: 500 * KB, message: "建议评估 PDF 相关能力是否可按路由或功能懒加载。" }],
        [/^(monaco-editor|codemirror|@codemirror\/)/, { priority: 2, family: "Editor", minSize: 500 * KB, message: "建议将编辑器能力拆到独立路由或异步组件。" }],
        [/^(echarts|zrender)/, { priority: 3, family: "Chart", minSize: 600 * KB, message: "建议按需注册图表、组件和渲染器，避免一次性引入完整图表库。" }],
        [/^(three|mapbox-gl|leaflet|ol|cesium)/, { priority: 4, family: "Map/3D", minSize: 500 * KB, message: "建议将地图或 3D 能力拆到业务页面懒加载，并检查插件和样式体积。" }],
        [/^ng-zorro-antd/, { priority: 5, family: "ng-zorro-antd", minSize: 700 * KB, message: "检测到 ng-zorro-antd 体积较高，建议检查组件、图标和样式是否按需引入。" }],
        [/^(ant-design-vue|antd|@ant-design\/|@ant-design\/icons)/, { priority: 5, family: "UI", minSize: 700 * KB, message: "建议检查组件按需引入、图标按需引入和主题样式裁剪。" }],
        [/^(moment|moment-timezone)$/, { priority: 6, family: "Date", minSize: 300 * KB, message: "建议评估 dayjs/date-fns 或裁剪 locale/timezone 数据。" }],
        [/^(lodash|lodash-es|crypto-js)$/, { priority: 7, family: "Utility", minSize: 250 * KB, message: "建议检查按函数引入、tree-shaking 或替代实现是否可行。" }],
        [/^(exceljs|xlsx|file-saver)/, { priority: 8, family: "Office/Export", minSize: 500 * KB, message: "建议评估导入导出能力是否可按功能懒加载。" }],
    ];

    const match = families.find(([pattern]) => pattern.test(normalized));
    return match?.[1];
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
    const isAngularProject = isAngularProjectDependencySet(dependencies);
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

    if (thirdPartyRatio > 0.75 && thirdPartySize > 1.5 * MB) {
        insights.push({
            level: "info",
            code: "dependency-third-party-ratio-high",
            category: "optimization",
            message: `第三方依赖约占模块体积 ${(thirdPartyRatio * 100).toFixed(1)}%。如果首屏体积较大，可优先检查 UI 库、图表、PDF、加密、地图等可选依赖的加载边界。`,
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
        .filter((dep) => !(isAngularProject && isAngularBaselineDependency(dep.name)))
        .map((dep) => ({ dep, hint: dependencyFamily(dep.name) }))
        .filter((item): item is { dep: TaskAnalyzeDependency; hint: DependencyFamilyHint } => !!item.hint)
        .filter((item) => item.dep.rawSize >= item.hint.minSize)
        .sort((a, b) => a.hint.priority - b.hint.priority || b.dep.rawSize - a.dep.rawSize)
        .slice(0, 5);
    for (const item of familyHints) {
        insights.push({
            level: "info",
            code: "dependency-heavy-family",
            category: "optimization",
            message: item.dep.name === "ng-zorro-antd"
                ? item.hint.message
                : `检测到 ${item.dep.name} 属于常见重型依赖（${item.hint.family}）。${item.hint.message}`,
            data: {
                ...item.dep,
                family: item.hint.family,
                hint: item.hint.message,
                priority: item.hint.priority,
            },
        });
    }

    const splitCandidates = dependencies
        .filter((dep) => dep.rawSize > 700 * KB && dep.moduleCount > 10)
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
