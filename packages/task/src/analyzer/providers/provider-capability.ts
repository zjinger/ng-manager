import fs from "node:fs/promises";
import path from "node:path";
import type { ProjectBuildDetection } from "../project-build-detector";
import type { TaskAnalyzerProviderCapability } from "../task-analyzer.types";

async function isFile(filePath: string): Promise<boolean> {
    try {
        return (await fs.stat(filePath)).isFile();
    } catch {
        return false;
    }
}

async function existingFiles(candidates: string[]): Promise<string[]> {
    const out: string[] = [];
    for (const candidate of candidates) {
        if (await isFile(candidate)) out.push(candidate);
    }
    return out;
}

function rollupVisualizerSuggestion(): TaskAnalyzerProviderCapability["suggestions"] {
    return [{
        title: "启用 rollup-plugin-visualizer raw-data 输出",
        message: "安装并配置 rollup-plugin-visualizer 输出 JSON/raw-data 后，ng-manager 可以读取依赖级分析数据。",
        packageName: "rollup-plugin-visualizer",
        installCommand: "npm i -D rollup-plugin-visualizer",
        configExample: `visualizer({
  template: 'raw-data',
  filename: 'dist/stats.json',
  gzipSize: true,
  brotliSize: true,
})`,
        docsUrl: "https://github.com/btd/rollup-plugin-visualizer",
    }];
}

function webpackBundleAnalyzerSuggestion(): TaskAnalyzerProviderCapability["suggestions"] {
    return [{
        title: "生成 webpack stats.json",
        message: "安装 webpack-bundle-analyzer 或使用 webpack stats 输出生成 stats.json 后，ng-manager 可以读取 webpack stats 数据。",
        packageName: "webpack-bundle-analyzer",
        installCommand: "npm i -D webpack-bundle-analyzer",
    }];
}

function angularStatsJsonSuggestion(): TaskAnalyzerProviderCapability["suggestions"] {
    return [{
        title: "生成 Angular stats.json",
        message: "执行 ng build --stats-json 后，ng-manager 会优先读取 stats.json；没有 stats 时会回退到 dist 产物扫描。",
        configExample: "ng build --stats-json",
    }];
}

async function detectRollupVisualizer(input: {
    projectRoot: string;
    detection: ProjectBuildDetection;
    outputPath?: string;
}): Promise<TaskAnalyzerProviderCapability> {
    const provider = input.detection.analyzerProviders?.rollupVisualizer;
    const dist = input.outputPath ?? path.resolve(input.projectRoot, "dist");
    const artifacts = await existingFiles([
        path.resolve(dist, "stats.json"),
        path.resolve(dist, "stats.html"),
        path.resolve(dist, "visualizer.json"),
        path.resolve(dist, "bundle-stats.json"),
        path.resolve(dist, ".vite", "stats.json"),
        path.resolve(input.projectRoot, "stats.json"),
        path.resolve(input.projectRoot, "stats.html"),
    ]);
    const jsonArtifacts = artifacts.filter((artifact) => artifact.toLowerCase().endsWith(".json"));
    const htmlArtifacts = artifacts.filter((artifact) => artifact.toLowerCase().endsWith(".html"));

    if (jsonArtifacts.length > 0) {
        return {
            provider: "rollup-visualizer",
            buildTool: input.detection.buildTool,
            status: "available",
            packageName: "rollup-plugin-visualizer",
            packageVersion: provider?.version,
            artifacts,
            reason: provider?.installed ? undefined : "artifact-without-detected-dependency",
            suggestions: rollupVisualizerSuggestion(),
        };
    }

    if (provider?.installed) {
        return {
            provider: "rollup-visualizer",
            buildTool: input.detection.buildTool,
            status: "missing-artifact",
            packageName: provider.packageName,
            packageVersion: provider.version,
            artifacts,
            reason: htmlArtifacts.length > 0 ? "html-only" : "no-json-artifact",
            suggestions: rollupVisualizerSuggestion(),
        };
    }

    return {
        provider: "rollup-visualizer",
        buildTool: input.detection.buildTool,
        status: "missing-dependency",
        packageName: "rollup-plugin-visualizer",
        artifacts,
        reason: htmlArtifacts.length > 0 ? "html-only" : "dependency-not-installed",
        suggestions: rollupVisualizerSuggestion(),
    };
}

async function detectWebpackBundleAnalyzer(input: {
    projectRoot: string;
    detection: ProjectBuildDetection;
}): Promise<TaskAnalyzerProviderCapability> {
    const provider = input.detection.analyzerProviders?.webpackBundleAnalyzer;
    const artifacts = await existingFiles([
        path.resolve(input.projectRoot, "dist", "stats.json"),
        path.resolve(input.projectRoot, "build", "stats.json"),
        path.resolve(input.projectRoot, "stats.json"),
    ]);

    if (artifacts.length > 0) {
        return {
            provider: "webpack-bundle-analyzer",
            buildTool: input.detection.buildTool,
            status: "available",
            packageName: "webpack-bundle-analyzer",
            packageVersion: provider?.version,
            artifacts,
            suggestions: webpackBundleAnalyzerSuggestion(),
        };
    }

    if (provider?.installed) {
        return {
            provider: "webpack-bundle-analyzer",
            buildTool: input.detection.buildTool,
            status: "missing-artifact",
            packageName: provider.packageName,
            packageVersion: provider.version,
            artifacts,
            reason: "stats-json-not-found",
            suggestions: webpackBundleAnalyzerSuggestion(),
        };
    }

    return {
        provider: "webpack-bundle-analyzer",
        buildTool: input.detection.buildTool,
        status: "missing-dependency",
        packageName: "webpack-bundle-analyzer",
        artifacts,
        reason: "dependency-not-installed",
        suggestions: webpackBundleAnalyzerSuggestion(),
    };
}

async function detectAngularStatsJson(input: {
    projectRoot: string;
    detection: ProjectBuildDetection;
    outputPath?: string;
}): Promise<TaskAnalyzerProviderCapability> {
    const roots = [
        ...(input.outputPath ? [input.outputPath] : []),
        path.resolve(input.projectRoot, "dist"),
        path.resolve(input.projectRoot, "dist", "browser"),
        input.projectRoot,
    ];
    const artifacts = await existingFiles(roots.map((root) => path.resolve(root, "stats.json")));

    return {
        provider: "angular-stats-json",
        buildTool: input.detection.buildTool,
        status: artifacts.length > 0 ? "available" : "missing-artifact",
        artifacts,
        reason: artifacts.length > 0 ? undefined : "stats-json-not-found",
        suggestions: angularStatsJsonSuggestion(),
    };
}

export async function detectAnalyzerProviderCapabilities(input: {
    projectRoot: string;
    detection: ProjectBuildDetection;
    outputPath?: string;
}): Promise<TaskAnalyzerProviderCapability[]> {
    switch (input.detection.buildTool) {
        case "vite":
            return [await detectRollupVisualizer(input)];
        case "webpack":
        case "vue-cli-webpack":
        case "angular-webpack":
            return [await detectWebpackBundleAnalyzer(input)];
        case "angular-esbuild":
            return [await detectAngularStatsJson(input)];
        default:
            return [];
    }
}
