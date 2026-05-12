import fs from "node:fs/promises";
import path from "node:path";
import type {
    TaskAnalyzeChunk,
    TaskAnalyzeInsight,
    TaskAnalyzeSummary,
    TaskAssetInfo,
} from "../task-analyzer.types";

interface AngularBudget {
    type?: string;
    name?: string;
    maximumWarning?: string;
    maximumError?: string;
    warning?: string;
    error?: string;
}

async function readJson(filePath: string): Promise<any | null> {
    try {
        return JSON.parse(await fs.readFile(filePath, "utf8"));
    } catch {
        return null;
    }
}

function getAngularProject(angularJson: any): any | undefined {
    const projects = angularJson?.projects ?? {};
    const projectName = angularJson?.defaultProject && projects[angularJson.defaultProject]
        ? angularJson.defaultProject
        : Object.keys(projects)[0];
    return projectName ? projects[projectName] : undefined;
}

function getBuildTarget(project: any): any | undefined {
    return project?.architect?.build ?? project?.targets?.build;
}

function parseSize(value?: string): number | null {
    if (!value || typeof value !== "string") return null;
    const match = value.trim().toLowerCase().match(/^(\d+(?:\.\d+)?)\s*(b|kb|kib|mb|mib|gb|gib)?$/);
    if (!match) return null;
    const amount = Number(match[1]);
    if (!Number.isFinite(amount)) return null;
    const unit = match[2] ?? "b";
    if (unit === "gb" || unit === "gib") return amount * 1024 * 1024 * 1024;
    if (unit === "mb" || unit === "mib") return amount * 1024 * 1024;
    if (unit === "kb" || unit === "kib") return amount * 1024;
    return amount;
}

function exceededLimit(budget: AngularBudget, measuredSize: number): { level: "warning" | "error"; limit: number; source: string } | null {
    const maxError = parseSize(budget.maximumError ?? budget.error);
    if (typeof maxError === "number" && measuredSize > maxError) {
        return { level: "error", limit: maxError, source: budget.maximumError ? "maximumError" : "error" };
    }

    const maxWarning = parseSize(budget.maximumWarning ?? budget.warning);
    if (typeof maxWarning === "number" && measuredSize > maxWarning) {
        return { level: "warning", limit: maxWarning, source: budget.maximumWarning ? "maximumWarning" : "warning" };
    }

    return null;
}

function findBundleSize(budget: AngularBudget, assets: TaskAssetInfo[], chunks: TaskAnalyzeChunk[]): number | null {
    const name = budget.name?.trim();
    if (!name) return null;

    const chunk = chunks.find((item) => item.name === name || item.files.some((file) => file.includes(name)));
    if (chunk) return chunk.rawSize;

    const matchedAssets = assets.filter((asset) => asset.name.includes(name) || asset.relativePath.includes(name));
    if (matchedAssets.length === 0) return null;
    return matchedAssets.reduce((sum, asset) => sum + asset.rawSize, 0);
}

function measuredSize(
    budget: AngularBudget,
    summary: TaskAnalyzeSummary,
    assets: TaskAssetInfo[],
    chunks: TaskAnalyzeChunk[]
): { size: number; label: string } | null {
    switch (budget.type) {
        case "initial": {
            const initial = chunks.filter((chunk) => chunk.initial);
            const size = initial.length > 0
                ? initial.reduce((sum, chunk) => sum + chunk.rawSize, 0)
                : summary.jsRawSize + summary.cssRawSize;
            return { size, label: "initial" };
        }
        case "bundle": {
            const size = findBundleSize(budget, assets, chunks);
            return typeof size === "number" ? { size, label: budget.name ? `bundle ${budget.name}` : "bundle" } : null;
        }
        case "all":
            return { size: summary.totalRawSize, label: "all" };
        case "allScript":
            return { size: summary.jsRawSize, label: "allScript" };
        case "any":
            return assets.length > 0 ? { size: Math.max(...assets.map((asset) => asset.rawSize)), label: "any" } : null;
        case "anyScript": {
            const scripts = assets.filter((asset) => asset.type === "js");
            return scripts.length > 0 ? { size: Math.max(...scripts.map((asset) => asset.rawSize)), label: "anyScript" } : null;
        }
        default:
            return null;
    }
}

export async function buildAngularBudgetInsights(input: {
    projectRoot: string;
    summary: TaskAnalyzeSummary;
    assets: TaskAssetInfo[];
    chunks?: TaskAnalyzeChunk[];
}): Promise<TaskAnalyzeInsight[]> {
    const angularJson = await readJson(path.join(input.projectRoot, "angular.json"));
    const project = getAngularProject(angularJson);
    const build = getBuildTarget(project);
    const defaultConfiguration = typeof build?.defaultConfiguration === "string" ? build.defaultConfiguration : "production";
    const configuredBudgets = build?.configurations?.[defaultConfiguration]?.budgets
        ?? build?.configurations?.production?.budgets
        ?? build?.options?.budgets;
    const budgets = Array.isArray(configuredBudgets) ? configuredBudgets as AngularBudget[] : [];
    if (budgets.length === 0) return [];

    const chunks = input.chunks ?? [];
    return budgets.flatMap((budget) => {
        const measured = measuredSize(budget, input.summary, input.assets, chunks);
        if (!measured) return [];
        const limit = exceededLimit(budget, measured.size);
        if (!limit) return [];

        return [{
            level: "warning" as const,
            code: "angular-budget-exceeded",
            category: "budget" as const,
            message: `Angular budget ${measured.label} 超过 ${limit.source} 阈值，建议检查构建预算或拆分产物。`,
            data: {
                budget,
                measuredSize: measured.size,
                limit: limit.limit,
                limitLevel: limit.level,
                source: limit.source,
            },
        }];
    });
}
