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

interface AngularBudgetCheck {
    type?: string;
    name?: string;
    status: "ok" | "warning" | "error" | "skipped";
    measuredLabel?: string;
    measuredSize?: number;
    warningLimit?: number;
    errorLimit?: number;
    exceededSource?: string;
    approximated?: boolean;
    reason?: string;
    budget: AngularBudget;
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

function formatSize(size: number): string {
    if (size < 1024) return `${Math.round(size)} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / 1024 / 1024).toFixed(2)} MB`;
}

function thresholdValue(budget: AngularBudget, kind: "warning" | "error"): { raw?: string; source?: string; size?: number; unsupported?: boolean } {
    const raw = kind === "warning" ? budget.maximumWarning ?? budget.warning : budget.maximumError ?? budget.error;
    const source = kind === "warning"
        ? budget.maximumWarning ? "maximumWarning" : budget.warning ? "warning" : undefined
        : budget.maximumError ? "maximumError" : budget.error ? "error" : undefined;
    if (!raw) return {};
    const size = parseSize(raw);
    return typeof size === "number" ? { raw, source, size } : { raw, source, unsupported: true };
}

function limitStatus(check: AngularBudgetCheck): AngularBudgetCheck {
    if (typeof check.measuredSize !== "number") return check;

    if (typeof check.errorLimit === "number" && check.measuredSize > check.errorLimit) {
        return { ...check, status: "error", exceededSource: check.budget.maximumError ? "maximumError" : "error" };
    }

    if (typeof check.warningLimit === "number" && check.measuredSize > check.warningLimit) {
        return { ...check, status: "warning", exceededSource: check.budget.maximumWarning ? "maximumWarning" : "warning" };
    }

    return { ...check, status: "ok" };
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
): { size: number; label: string; approximated?: boolean; reason?: string } | null {
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
        case "allStyle":
            return { size: summary.cssRawSize, label: "allStyle" };
        case "any":
            return assets.length > 0 ? { size: Math.max(...assets.map((asset) => asset.rawSize)), label: "any" } : null;
        case "anyScript": {
            const scripts = assets.filter((asset) => asset.type === "js");
            return scripts.length > 0 ? { size: Math.max(...scripts.map((asset) => asset.rawSize)), label: "anyScript" } : null;
        }
        case "anyStyle": {
            const styles = assets.filter((asset) => asset.type === "css");
            return styles.length > 0 ? { size: Math.max(...styles.map((asset) => asset.rawSize)), label: "anyStyle" } : null;
        }
        case "anyComponentStyle": {
            const styles = assets.filter((asset) => asset.type === "css");
            return styles.length > 0
                ? { size: Math.max(...styles.map((asset) => asset.rawSize)), label: "anyComponentStyle", approximated: true }
                : null;
        }
        default:
            return null;
    }
}

function buildCheck(
    budget: AngularBudget,
    summary: TaskAnalyzeSummary,
    assets: TaskAssetInfo[],
    chunks: TaskAnalyzeChunk[]
): AngularBudgetCheck {
    const warning = thresholdValue(budget, "warning");
    const error = thresholdValue(budget, "error");
    const base: AngularBudgetCheck = {
        type: budget.type,
        name: budget.name,
        status: "skipped",
        warningLimit: warning.size,
        errorLimit: error.size,
        budget,
    };

    if (warning.unsupported || error.unsupported) {
        return { ...base, reason: "unsupported-threshold" };
    }

    if (typeof warning.size !== "number" && typeof error.size !== "number") {
        return { ...base, reason: "no-maximum-threshold" };
    }

    if (!budget.type) {
        return { ...base, reason: "missing-type" };
    }

    const supportedTypes = new Set([
        "initial",
        "bundle",
        "all",
        "allScript",
        "any",
        "anyScript",
        "allStyle",
        "anyStyle",
        "anyComponentStyle",
    ]);
    if (!supportedTypes.has(budget.type)) {
        return { ...base, reason: "unsupported-type" };
    }

    if (budget.type === "bundle" && !budget.name?.trim()) {
        return { ...base, reason: "missing-bundle-name" };
    }

    const measured = measuredSize(budget, summary, assets, chunks);
    if (!measured) {
        return {
            ...base,
            reason: budget.type === "bundle" ? "bundle-not-found" : "no-matching-assets",
        };
    }

    return limitStatus({
        ...base,
        measuredLabel: measured.label,
        measuredSize: measured.size,
        approximated: measured.approximated,
        reason: measured.reason,
    });
}

function skippedMessage(check: AngularBudgetCheck): string {
    const label = check.name ? `${check.type} ${check.name}` : check.type ?? "unknown";
    if (check.reason === "bundle-not-found" || check.reason === "missing-bundle-name") {
        return `Angular budget ${label} 未能匹配到对应 chunk 或 asset，已跳过该预算检查。`;
    }
    if (check.reason === "unsupported-threshold") {
        return `Angular budget ${label} 使用了暂不支持的阈值写法，已跳过该预算检查。`;
    }
    if (check.reason === "unsupported-type" || check.reason === "missing-type") {
        return `Angular budget ${label} 暂不支持，已跳过该预算检查。`;
    }
    return `Angular budget ${label} 无法测量，已跳过该预算检查。`;
}

function exceededMessage(check: AngularBudgetCheck): string {
    const label = check.name ? `${check.type} ${check.name}` : check.measuredLabel ?? check.type ?? "unknown";
    const statusLabel = check.status === "error" ? "error" : "warning";
    const limit = check.status === "error" ? check.errorLimit : check.warningLimit;
    const suffix = check.approximated ? "（近似计算）" : "";
    return `Angular budget ${label} 超过 ${statusLabel} 阈值：当前 ${formatSize(check.measuredSize ?? 0)}，限制 ${formatSize(limit ?? 0)}。${suffix}`;
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
    const checks = budgets.map((budget) => buildCheck(budget, input.summary, input.assets, chunks));
    return checks.flatMap((check): TaskAnalyzeInsight[] => {
        if (check.status === "ok") return [];

        if (check.status === "skipped") {
            if (!["bundle-not-found", "missing-bundle-name", "unsupported-type", "missing-type", "unsupported-threshold"].includes(check.reason ?? "")) {
                return [];
            }
            return [{
                level: "info" as const,
                code: "angular-budget-skipped",
                category: "budget" as const,
                message: skippedMessage(check),
                data: { check },
            }];
        }

        return [{
            level: "warning" as const,
            code: check.status === "error" ? "angular-budget-error" : "angular-budget-warning",
            category: "budget" as const,
            message: exceededMessage(check),
            data: { check },
        }];
    });
}
