export type TaskRunStatus = "idle" | "running" | "stopping" | "success" | "failed" | "stopped";
export type TaskKind = "run" | "build" | "test" | "lint" | "custom";

export interface TaskDefinition {
    id: string;
    projectId: string;
    projectRoot: string;
    projectName: string;
    name: string;
    kind?: TaskKind;
    description?: string;
    command?: string;
    file?: string;
    args?: string[];
    runnable?: boolean;
    cwd?: string;
    shell?: boolean;
    env?: Record<string, string>;
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
}

export interface TaskRow {
    spec: TaskDefinition;
    runtime?: TaskRuntime;
}
