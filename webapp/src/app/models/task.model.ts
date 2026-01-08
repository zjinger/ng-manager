export type TaskStatus = "idle" | "running" | "stopping" | "success" | "failed" | "stopped";
export type LogType = "stdout" | "stderr" | "system";
export type TaskKind = "run" | "build" | "test" | "lint" | "custom";
export interface TaskDefinition {
    id: string;        // dev:serve
    name: string;      // 启动前端
    group?: string;    // frontend/backend/tools
    command?: string;  // UI可展示（可选）
    kind?: TaskKind;
    description?: string;

    runnable?: boolean; // 是否可运行（默认 true）
}

export interface TaskRuntime {
    taskId: string;
    projectId: string;
    runId: string;           // NEW
    status: TaskStatus;

    pid?: number;
    startedAt?: number;
    stoppedAt?: number;
    exitCode?: number | null;
    signal?: string | null;
}

export type StartTaskPayload = {
    id?: string;
    projectId: string;
    name: string;
    command: string;
    cwd: string;
    env?: Record<string, string>;
};

export interface TaskRow {
    spec: TaskDefinition;
    runtime: TaskRuntime;
}

export interface TaskLogLine {
    taskId: string;
    type: LogType;
    message: string;
    time: number;
    level?: string;
}

export type TaskConsoleLine = {
    ts?: number;
    text: string;
    level?: string;
    stream?: LogType;
};

export type TaskRuntimeStatus =
    | { status: "idle" }
    | { status: "running"; pid?: number; startedAt?: number }
    | { status: "stopping" }
    | { status: "stopped"; exitCode?: number | null; signal?: string | null; stoppedAt?: number };
