import fs from "node:fs/promises";
import path from "node:path";

export interface AngularOutputPathResult {
    outputPath: string;
    source: "angular.json" | "fallback";
    projectName?: string;
}

async function pathExists(target: string) {
    try {
        await fs.access(target);
        return true;
    } catch {
        return false;
    }
}

function resolveConfiguredOutput(projectRoot: string, outputPath: unknown): string | null {
    if (typeof outputPath === "string" && outputPath.trim()) {
        return path.resolve(projectRoot, outputPath);
    }

    if (outputPath && typeof outputPath === "object") {
        const value = outputPath as { base?: unknown; browser?: unknown };
        const base = typeof value.base === "string" ? value.base : "";
        const browser = typeof value.browser === "string" ? value.browser : "";
        if (base) return path.resolve(projectRoot, base, browser);
    }

    return null;
}

export async function resolveAngularOutputPath(projectRoot: string): Promise<AngularOutputPathResult> {
    const angularJsonPath = path.join(projectRoot, "angular.json");
    const fallbackOutput = path.resolve(projectRoot, "dist");

    try {
        const text = await fs.readFile(angularJsonPath, "utf8");
        const json = JSON.parse(text) as {
            defaultProject?: string;
            projects?: Record<string, any>;
        };
        const projects = json.projects ?? {};
        const projectName = json.defaultProject && projects[json.defaultProject]
            ? json.defaultProject
            : Object.keys(projects)[0];
        const project = projectName ? projects[projectName] : undefined;
        const build = project?.architect?.build ?? project?.targets?.build;
        const configured = resolveConfiguredOutput(projectRoot, build?.options?.outputPath);
        const outputPath = configured ?? path.resolve(projectRoot, "dist", projectName ?? "");
        const distBrowser = path.resolve(projectRoot, "dist", "browser");

        if (await pathExists(distBrowser)) {
            return { outputPath: distBrowser, source: "angular.json", projectName };
        }

        return { outputPath, source: "angular.json", projectName };
    } catch {
        const distBrowser = path.resolve(projectRoot, "dist", "browser");
        if (await pathExists(distBrowser)) {
            return { outputPath: distBrowser, source: "fallback" };
        }
        return { outputPath: fallbackOutput, source: "fallback" };
    }
}
