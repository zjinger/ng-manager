import type { TaskAnalyzeDependency, TaskAnalyzeModule } from "../task-analyzer.types";

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
