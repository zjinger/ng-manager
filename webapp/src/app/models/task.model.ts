export type TaskStatus = "idle" | "running" | "stopping" | "success" | "failed" | "stopped";
export type TaskEventType = "snapshot" | "started" | "stopRequested" | "exited" | "failed";
export type LogType = "stdout" | "stderr" | "system";
export type TaskKind = "run" | "build" | "test" | "lint" | "custom";
export interface TaskDefinition {
    id: string;        // dev:serve
    name: string;      // 启动前端
    command?: string;  // 展示用的命令行
    kind?: TaskKind;
    description?: string;
    runnable?: boolean; // 是否可运行（默认 true）
}

export interface TaskRuntime {
    taskId: string;
    projectId: string;
    runId: string;
    status: TaskStatus;
    pid?: number;
    startedAt?: number;
    stoppedAt?: number;
    exitCode?: number | null;
    signal?: string | null;
}

/**
 * TaskRow 里只保留“引用信息”，不保留实时 status
 * （实时 status 由 WS -> TaskRuntimeStore 单源管理）
 */
export interface TaskRuntimeRef {
    runId?: string;              // 最近一次（或当前 active）的 runId
    lastExitCode?: number | null; // 可选：做历史展示
    lastStoppedAt?: number;       // 可选：做历史展示
}


export interface TaskRow {
    spec: TaskDefinition;
    runtime?: TaskRuntimeRef;
}

export interface TaskLogLine {
    taskId: string;
    type: LogType;
    message: string;
    time: number;
    level?: string;
}

export type TaskRuntimeStatus =
    | { status: "idle" }
    | { status: "running"; pid?: number; startedAt?: number }
    | { status: "stopping" }
    | { status: "stopped"; exitCode?: number | null; signal?: string | null; stoppedAt?: number };

export type TaskOutputMsg = {
    runId: string;
    stream: LogType;
    chunk: string;
    ts: number;
};

export type TaskEventMsg = {
    runId: string;
    type: TaskEventType;
    payload: any;
    ts: number;
};