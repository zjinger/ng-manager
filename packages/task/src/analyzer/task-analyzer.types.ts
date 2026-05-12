import type { TaskDefinition, TaskRuntime } from "../task.types";
import type { ProjectBuildDetection } from "./project-build-detector";

export type TaskAssetType = "js" | "css" | "html" | "image" | "font" | "map" | "asset";

export interface TaskAnalyzeContext {
    spec: TaskDefinition;
    runtime: TaskRuntime;
    detection?: ProjectBuildDetection;
    diagnostics?: TaskAnalyzeDiagnostic[];
}

export interface TaskAssetInfo {
    name: string;
    path: string;
    relativePath: string;
    ext: string;
    type: TaskAssetType;
    rawSize: number;
    gzipSize?: number;
    brotliSize?: number;
    ratio?: number;
}

export interface TaskAnalyzeSummary {
    outputPath?: string;
    durationMs?: number;
    fileCount: number;
    totalRawSize: number;
    totalGzipSize: number;
    totalBrotliSize?: number;
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
        brotliSize?: number;
    };
    topAssets?: Array<{
        name: string;
        relativePath: string;
        type: TaskAssetType;
        rawSize: number;
        gzipSize?: number;
        brotliSize?: number;
        ratio?: number;
    }>;
}

export interface TaskAnalyzeWarning {
    code: string;
    message: string;
    data?: unknown;
}

export type TaskAnalyzeInsightCategory = "risk" | "optimization" | "migration" | "budget" | "diagnostic";

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
    category?: TaskAnalyzeInsightCategory;
    data?: unknown;
}

export type TaskAnalyzerProviderStatus =
    | "available"
    | "missing-dependency"
    | "missing-artifact"
    | "unsupported"
    | "disabled";

export interface TaskAnalyzerProviderSuggestion {
    title: string;
    message: string;
    packageName?: string;
    installCommand?: string;
    configExample?: string;
    docsUrl?: string;
}

export interface TaskAnalyzerProviderCapability {
    provider: string;
    buildTool: string;
    status: TaskAnalyzerProviderStatus;
    packageName?: string;
    packageVersion?: string;
    artifacts?: string[];
    reason?: string;
    suggestions?: TaskAnalyzerProviderSuggestion[];
}

export interface TaskAnalyzeStats {
    statsPath: string;
    format: "esbuild-metafile" | "webpack-stats" | "rollup-visualizer" | "vite-manifest" | "unknown";
    chunks: TaskAnalyzeChunk[];
    modules: TaskAnalyzeModule[];
    dependencies: TaskAnalyzeDependency[];
    insights: TaskAnalyzeInsight[];
}

export type TaskAnalyzeDiagnosticStatus = "success" | "skipped" | "failed" | "supported" | "no-report" | "succeeded";

export type TaskAnalyzeDiagnosticPhase = "detect" | "supports" | "analyze" | "parse" | "fallback";

export interface TaskAnalyzeDiagnostic {
    analyzer: string;
    status: TaskAnalyzeDiagnosticStatus;
    phase: TaskAnalyzeDiagnosticPhase;
    message?: string;
    error?: string;
    data?: unknown;
    createdAt: number;
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
    diagnostics?: TaskAnalyzeDiagnostic[];
}

export interface TaskAnalyzeReportSummary {
    runId: string;
    taskId: string;
    projectId: string;
    analyzer: string;
    createdAt: number;
    totalRawSize: number;
    totalGzipSize: number;
    totalBrotliSize?: number;
    jsRawSize: number;
    cssRawSize: number;
    assetRawSize: number;
    fileCount: number;
    durationMs?: number;
}

export interface TaskAnalyzeReportStore {
    save(report: TaskAnalyzeResult): Promise<void> | void;
    getByRunId(runId: string): Promise<TaskAnalyzeResult | null> | TaskAnalyzeResult | null;
    listByTaskId(taskId: string, limit?: number): Promise<TaskAnalyzeResult[]> | TaskAnalyzeResult[];
    listByProjectId(projectId: string, limit?: number): Promise<TaskAnalyzeResult[]> | TaskAnalyzeResult[];
    listSummaryByTaskId(taskId: string, limit?: number): Promise<TaskAnalyzeReportSummary[]> | TaskAnalyzeReportSummary[];
    listSummaryByProjectId(projectId: string, limit?: number): Promise<TaskAnalyzeReportSummary[]> | TaskAnalyzeReportSummary[];
}

export interface TaskAnalyzer {
    name: string;
    supports(ctx: TaskAnalyzeContext): boolean;
    analyze(ctx: TaskAnalyzeContext): Promise<TaskAnalyzeResult | null>;
}
