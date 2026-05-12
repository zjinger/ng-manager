import type { LogLine } from "../ws.log.types";
import type { TaskRowDto, TaskRuntimeDto } from "./task-runtime.dto";

export type TaskAssetTypeDto = "js" | "css" | "html" | "image" | "font" | "map" | "asset";

export interface TaskAssetInfoDto {
    name: string;
    path: string;
    relativePath: string;
    ext: string;
    type: TaskAssetTypeDto;
    rawSize: number;
    gzipSize?: number;
    brotliSize?: number;
    ratio?: number;
}

export interface TaskAnalyzeSummaryDto {
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
        type: TaskAssetTypeDto;
        rawSize: number;
        gzipSize?: number;
        brotliSize?: number;
        ratio?: number;
    }>;
}

export interface TaskAnalyzeResultDto {
    runId: string;
    taskId: string;
    projectId: string;
    analyzer: string;
    createdAt: number;
    summary: TaskAnalyzeSummaryDto;
    assets: TaskAssetInfoDto[];
    stats?: {
        statsPath: string;
        format: "esbuild-metafile" | "webpack-stats" | "rollup-visualizer" | "vite-manifest" | "unknown";
        chunks: Array<{
            name: string;
            files: string[];
            rawSize: number;
            initial?: boolean;
            entry?: boolean;
        }>;
        modules: Array<{
            name: string;
            path?: string;
            rawSize: number;
            packageName?: string;
            chunk?: string;
        }>;
        dependencies: Array<{
            name: string;
            rawSize: number;
            moduleCount: number;
            ratio?: number;
        }>;
        insights: Array<{
            level: "info" | "warning";
            code: string;
            message: string;
            category?: "risk" | "optimization" | "migration" | "budget" | "diagnostic";
            data?: unknown;
        }>;
    };
    warnings?: Array<{
        code: string;
        message: string;
        data?: unknown;
    }>;
    diagnostics?: TaskAnalyzeDiagnosticDto[];
}

export type TaskAnalyzeDiagnosticStatusDto = "supported" | "skipped" | "failed" | "no-report" | "succeeded";

export interface TaskAnalyzeDiagnosticDto {
    analyzer: string;
    status: TaskAnalyzeDiagnosticStatusDto;
    phase: "supports" | "analyze";
    message?: string;
    data?: unknown;
}

export interface TaskDashboardDto {
    taskId: string;
    projectId: string;
    runId?: string;
    status: "idle" | "running" | "stopping" | "stopped" | "success" | "failed";
    progress: {
        startedAt?: number;
        stoppedAt?: number;
        durationMs?: number;
        readyAt?: number;
        rebuildDurationMs?: number;
    };
    sizes?: {
        outputPath?: string;
        fileCount: number;
        totalRawSize: number;
        totalGzipSize: number;
        totalBrotliSize?: number;
        jsRawSize: number;
        cssRawSize: number;
        assetRawSize: number;
    };
    problems: {
        warningsCount: number;
        errorsCount: number;
        lastError?: string;
    };
    urls: string[];
}

export type TaskListResponseDto = TaskRowDto[];
export type TaskRefreshResponseDto = TaskRowDto[];
export type TaskRuntimeResponseDto = TaskRuntimeDto;
export type TaskActiveResponseDto = TaskRuntimeDto[];
export type TaskRunLogResponseDto = LogLine[];
export type TaskReportResponseDto = TaskAnalyzeResultDto | null;
export type TaskAnalyzeDiagnosticsResponseDto = TaskAnalyzeDiagnosticDto[];
export type TaskDashboardResponseDto = TaskDashboardDto | null;
