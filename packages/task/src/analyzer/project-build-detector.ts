import fs from "node:fs/promises";
import path from "node:path";

export type ProjectFramework = "angular" | "vue" | "react" | "unknown";
export type ProjectBuildTool = "angular-esbuild" | "angular-webpack" | "vite" | "vue-cli-webpack" | "webpack" | "unknown";
export type AngularBuildSystem =
    | "legacy-browser-webpack"
    | "browser-esbuild"
    | "application-builder"
    | "unknown";

export interface AngularBuildDetection {
    builder?: string;
    buildSystem: AngularBuildSystem;

    usesApplicationBuilder: boolean;
    usesBrowserBuilder: boolean;
    usesBrowserEsbuildBuilder: boolean;

    usesAngularBuildPackage: boolean;
    usesAngularDevkitBuildAngular: boolean;

    hasLegacyServerBuilder: boolean;
    hasLegacyPrerenderBuilder: boolean;
    hasTsconfigServer: boolean;
    appTsconfigEsModuleInterop?: boolean;

    outputPathKind?: "string" | "object" | "unknown";
    outputPathBase?: string;
    outputPathBrowser?: string;
    outputPathServer?: string;

    migrationHints: string[];
}

export interface ProjectBuildDetection {
    framework: ProjectFramework;
    buildTool: ProjectBuildTool;
    angular?: AngularBuildDetection;
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

function getAngularProject(angularJson: any): any | undefined {
    const projects = angularJson?.projects ?? {};
    const projectName = angularJson?.defaultProject && projects[angularJson.defaultProject]
        ? angularJson.defaultProject
        : Object.keys(projects)[0];
    return projectName ? projects[projectName] : undefined;
}

function getAngularTarget(project: any, targetName: string): any | undefined {
    return project?.architect?.[targetName] ?? project?.targets?.[targetName];
}

function detectAngularBuildSystem(builder?: string): AngularBuildSystem {
    if (!builder) return "unknown";
    if (builder.includes(":application")) return "application-builder";
    if (builder.includes(":browser-esbuild")) return "browser-esbuild";
    if (builder.includes(":browser")) return "legacy-browser-webpack";
    return "unknown";
}

function detectOutputPath(outputPath: unknown): Pick<
    AngularBuildDetection,
    "outputPathKind" | "outputPathBase" | "outputPathBrowser" | "outputPathServer"
> {
    if (typeof outputPath === "string") {
        return {
            outputPathKind: "string",
            outputPathBase: outputPath,
        };
    }

    if (outputPath && typeof outputPath === "object") {
        const value = outputPath as { base?: unknown; browser?: unknown; server?: unknown };
        return {
            outputPathKind: "object",
            outputPathBase: typeof value.base === "string" ? value.base : undefined,
            outputPathBrowser: typeof value.browser === "string" ? value.browser : undefined,
            outputPathServer: typeof value.server === "string" ? value.server : undefined,
        };
    }

    return { outputPathKind: "unknown" };
}

function buildMigrationHints(input: {
    buildSystem: AngularBuildSystem;
    hasLegacyServerBuilder: boolean;
    hasLegacyPrerenderBuilder: boolean;
    hasTsconfigServer: boolean;
    appTsconfigEsModuleInterop?: boolean;
}): string[] {
    const hints: string[] = [];

    if (input.buildSystem === "legacy-browser-webpack") {
        hints.push("当前项目使用旧 Angular browser webpack builder，可考虑执行 ng update @angular/cli --name use-application-builder 迁移到 application builder。");
    }

    if (input.buildSystem === "browser-esbuild") {
        hints.push("当前项目使用 browser-esbuild builder，属于新构建体系过渡形态，可进一步迁移到 application builder。");
    }

    if (input.hasLegacyServerBuilder || input.hasLegacyPrerenderBuilder) {
        hints.push("检测到旧 SSR/server builder。application builder 已集成 SSR/prerender，迁移时需检查服务器入口和输出目录结构。");
    }

    if (input.hasTsconfigServer) {
        hints.push("检测到 tsconfig.server.json。迁移 application builder 时通常会合并到 tsconfig.app.json。");
    }

    if (input.appTsconfigEsModuleInterop !== true) {
        hints.push("tsconfig.app.json 未检测到 compilerOptions.esModuleInterop=true，SSR/Express ESM 兼容场景可能需要关注。");
    }

    return hints;
}

async function detectAngularBuild(
    projectRoot: string,
    angularJson: any,
    deps: Record<string, string>
): Promise<AngularBuildDetection | undefined> {
    if (!angularJson && !deps["@angular/core"]) return undefined;

    const project = angularJson ? getAngularProject(angularJson) : undefined;
    const build = getAngularTarget(project, "build");
    const server = getAngularTarget(project, "server");
    const prerender = getAngularTarget(project, "prerender");
    const builder = build?.builder as string | undefined;
    const buildSystem = detectAngularBuildSystem(builder);
    const serverBuilder = String(server?.builder ?? "");
    const prerenderBuilder = String(prerender?.builder ?? "");
    const hasLegacyServerBuilder = serverBuilder.includes("@angular-devkit/build-angular:server");
    const hasLegacyPrerenderBuilder = prerenderBuilder.includes("@angular-devkit/build-angular:prerender");
    const hasTsconfigServer = await exists(path.join(projectRoot, "tsconfig.server.json"));
    const appTsconfig = await readJson(path.join(projectRoot, "tsconfig.app.json"));
    const appTsconfigEsModuleInterop = typeof appTsconfig?.compilerOptions?.esModuleInterop === "boolean"
        ? appTsconfig.compilerOptions.esModuleInterop
        : undefined;

    return {
        builder,
        buildSystem,
        usesApplicationBuilder: buildSystem === "application-builder",
        usesBrowserBuilder: buildSystem === "legacy-browser-webpack",
        usesBrowserEsbuildBuilder: buildSystem === "browser-esbuild",
        usesAngularBuildPackage: !!deps["@angular/build"],
        usesAngularDevkitBuildAngular: !!deps["@angular-devkit/build-angular"],
        hasLegacyServerBuilder,
        hasLegacyPrerenderBuilder,
        hasTsconfigServer,
        appTsconfigEsModuleInterop,
        ...detectOutputPath(build?.options?.outputPath),
        migrationHints: buildMigrationHints({
            buildSystem,
            hasLegacyServerBuilder,
            hasLegacyPrerenderBuilder,
            hasTsconfigServer,
            appTsconfigEsModuleInterop,
        }),
    };
}

export async function detectProjectBuild(projectRoot: string): Promise<ProjectBuildDetection> {
    const pkg = await readJson(path.join(projectRoot, "package.json"));
    const angularJson = await readJson(path.join(projectRoot, "angular.json"));
    const deps = depsOf(pkg);
    const scripts = (pkg?.scripts ?? {}) as Record<string, string>;
    const angular = await detectAngularBuild(projectRoot, angularJson, deps);
    const angularBuilder = angular?.builder;
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
    if (angular?.buildSystem === "application-builder" || angular?.buildSystem === "browser-esbuild") {
        buildTool = "angular-esbuild";
    } else if (angular?.buildSystem === "legacy-browser-webpack") {
        buildTool = "angular-webpack";
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
        angular,
        angularBuilder,
        hasViteConfig,
        hasVueCliService,
        hasWebpackConfig,
        packageManagerScripts: scripts,
    };
}
