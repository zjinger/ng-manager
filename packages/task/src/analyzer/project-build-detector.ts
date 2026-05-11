import fs from "node:fs/promises";
import path from "node:path";

export type ProjectFramework = "angular" | "vue" | "react" | "unknown";
export type ProjectBuildTool = "angular-esbuild" | "angular-webpack" | "vite" | "vue-cli-webpack" | "webpack" | "unknown";

export interface ProjectBuildDetection {
    framework: ProjectFramework;
    buildTool: ProjectBuildTool;
    angularBuilder?: string;
    hasViteConfig: boolean;
    hasVueCliService: boolean;
    hasWebpackConfig: boolean;
    packageManagerScripts: Record<string, string>;
}

async function readJson(filePath: string): Promise<any | null> {
    try {
        return JSON.parse(await fs.readFile(filePath, "utf8"));
    } catch {
        return null;
    }
}

async function exists(filePath: string) {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
}

function depsOf(pkg: any): Record<string, string> {
    return {
        ...(pkg?.dependencies ?? {}),
        ...(pkg?.devDependencies ?? {}),
    };
}

function detectAngularBuilder(angularJson: any): string | undefined {
    const projects = angularJson?.projects ?? {};
    const projectName = angularJson?.defaultProject && projects[angularJson.defaultProject]
        ? angularJson.defaultProject
        : Object.keys(projects)[0];
    const project = projectName ? projects[projectName] : undefined;
    return project?.architect?.build?.builder ?? project?.targets?.build?.builder;
}

export async function detectProjectBuild(projectRoot: string): Promise<ProjectBuildDetection> {
    const pkg = await readJson(path.join(projectRoot, "package.json"));
    const angularJson = await readJson(path.join(projectRoot, "angular.json"));
    const deps = depsOf(pkg);
    const scripts = (pkg?.scripts ?? {}) as Record<string, string>;
    const angularBuilder = angularJson ? detectAngularBuilder(angularJson) : undefined;
    const hasViteConfig = await exists(path.join(projectRoot, "vite.config.ts"))
        || await exists(path.join(projectRoot, "vite.config.js"))
        || await exists(path.join(projectRoot, "vite.config.mjs"));
    const hasWebpackConfig = await exists(path.join(projectRoot, "webpack.config.js"))
        || await exists(path.join(projectRoot, "webpack.config.ts"))
        || await exists(path.join(projectRoot, "webpack.config.cjs"));
    const hasVueCliService = !!deps["@vue/cli-service"] || Object.values(scripts).some((script) => script.includes("vue-cli-service"));

    let framework: ProjectFramework = "unknown";
    if (angularJson || deps["@angular/core"]) framework = "angular";
    else if (deps.vue || hasVueCliService) framework = "vue";
    else if (deps.react || deps["react-dom"]) framework = "react";

    let buildTool: ProjectBuildTool = "unknown";
    if (angularBuilder) {
        if (angularBuilder.includes("browser-esbuild") || angularBuilder.includes("application")) buildTool = "angular-esbuild";
        else if (angularBuilder.includes("browser")) buildTool = "angular-webpack";
    } else if (hasViteConfig || deps.vite || Object.values(scripts).some((script) => /\bvite\b/.test(script))) {
        buildTool = "vite";
    } else if (hasVueCliService) {
        buildTool = "vue-cli-webpack";
    } else if (hasWebpackConfig || deps.webpack) {
        buildTool = "webpack";
    }

    return {
        framework,
        buildTool,
        angularBuilder,
        hasViteConfig,
        hasVueCliService,
        hasWebpackConfig,
        packageManagerScripts: scripts,
    };
}
