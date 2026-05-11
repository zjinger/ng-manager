export type TaskRunStatus = "idle" | "running" | "stopping" | "success" | "failed" | "stopped";
export type TaskKind = "run" | "serve" | "build" | "test" | "lint" | "inspect" | "custom";
export type TaskViewId = "output" | "dashboard" | "analyzer";

export interface TaskViewDefinition {
    id: TaskViewId;
    title: string;
}

export interface TaskCapabilities {
    dashboard?: boolean;
    analyzer?: boolean;
    report?: boolean;
}

export interface TaskDefinition {
    id: string;
    projectId: string;
    projectRoot: string;
    projectName: string;
    name: string;
    kind?: TaskKind;
    description?: string;
    command?: string;
    displayCommand?: string;
    file?: string;
    args?: string[];
    runnable?: boolean;
    cwd?: string;
    shell?: boolean;
    env?: Record<string, string>;
    views?: TaskViewDefinition[];
    capabilities?: TaskCapabilities;
}

export interface TaskRuntime {
    taskId: string;
    projectId: string;
    name: string;
    runId: string;
    status: TaskRunStatus;
    pid?: number;
    startedAt?: number;
    stoppedAt?: number;
    exitCode?: number | null;
    signal?: string | null;
    lastError?: string;
    urls?: string[];
    lastOutputAt?: number;
    readyAt?: number;
    rebuildDurationMs?: number;
    warningsCount?: number;
    errorsCount?: number;
}

export interface TaskRow {
    spec: TaskDefinition;
    runtime?: TaskRuntime;
}

export interface TaskDashboard {
    taskId: string;
    projectId: string;
    runId?: string;
    status: TaskRunStatus;
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
