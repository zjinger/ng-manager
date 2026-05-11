import type { TaskDefinition, TaskRuntime } from "../task.types";
import type { ProjectBuildDetection } from "./project-build-detector";

export type TaskAssetType = "js" | "css" | "html" | "image" | "font" | "map" | "asset";

export interface TaskAnalyzeContext {
    spec: TaskDefinition;
    runtime: TaskRuntime;
    detection?: ProjectBuildDetection;
}

export interface TaskAssetInfo {
    name: string;
    path: string;
    relativePath: string;
    ext: string;
    type: TaskAssetType;
    rawSize: number;
    gzipSize?: number;
    ratio?: number;
}

export interface TaskAnalyzeSummary {
    outputPath?: string;
    durationMs?: number;
    fileCount: number;
    totalRawSize: number;
    totalGzipSize: number;
    jsRawSize: number;
    cssRawSize: number;
    assetRawSize: number;
    jsFileCount: number;
    cssFileCount: number;
    assetFileCount: number;
    largestFile?: {
        name: string;
        rawSize: number;
        gzipSize?: number;
    };
    topAssets?: Array<{
        name: string;
        relativePath: string;
        type: TaskAssetType;
        rawSize: number;
        gzipSize?: number;
        ratio?: number;
    }>;
}

export interface TaskAnalyzeWarning {
    code: string;
    message: string;
    data?: unknown;
}

export interface TaskAnalyzeChunk {
    name: string;
    files: string[];
    rawSize: number;
    initial?: boolean;
    entry?: boolean;
}

export interface TaskAnalyzeModule {
    name: string;
    path?: string;
    rawSize: number;
    packageName?: string;
    chunk?: string;
}

export interface TaskAnalyzeDependency {
    name: string;
    rawSize: number;
    moduleCount: number;
    ratio?: number;
}

export interface TaskAnalyzeInsight {
    level: "info" | "warning";
    code: string;
    message: string;
    data?: unknown;
}

export interface TaskAnalyzeStats {
    statsPath: string;
    format: "esbuild-metafile" | "webpack-stats" | "rollup-visualizer" | "unknown";
    chunks: TaskAnalyzeChunk[];
    modules: TaskAnalyzeModule[];
    dependencies: TaskAnalyzeDependency[];
    insights: TaskAnalyzeInsight[];
}

export interface TaskAnalyzeResult {
    runId: string;
    taskId: string;
    projectId: string;
    analyzer: string;
    createdAt: number;
    summary: TaskAnalyzeSummary;
    assets: TaskAssetInfo[];
    stats?: TaskAnalyzeStats;
    warnings?: TaskAnalyzeWarning[];
}

export interface TaskAnalyzer {
    name: string;
    supports(ctx: TaskAnalyzeContext): boolean;
    analyze(ctx: TaskAnalyzeContext): Promise<TaskAnalyzeResult | null>;
}
