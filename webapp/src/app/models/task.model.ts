export type TaskStatus = "idle" | "running" | "stopping" | "success" | "failed" | "stopped";
export type TaskEventType = | "snapshot" | "started" | "stopRequested" | "exited" | "failed";
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

export interface TaskRow {
    spec: TaskDefinition;
    runtime?: TaskRuntime;
    ui?: {
        status?: TaskStatus;
        runId?: string;
    }
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


export type TaskSnapshotPayload = {
    taskId: string;
    projectId: string;
    runId: string;
    status: "running" | "stopping" | "stopped" | "success" | "failed";
    pid?: number;
    startedAt?: number;
    stoppedAt?: number;
    exitCode?: number | null;
    signal?: string | null;
};

export type TaskStartedPayload = {
    taskId: string;
    runId: string;
    pid?: number;
};

export type TaskExitedPayload = {
    taskId: string;
    runId: string;
    exitCode: number | null;
    signal: string | null;
};

export type TaskFailedPayload = {
    taskId: string;
    runId: string;
    error: string;
};

export type TaskEventPayloadMap = {
    snapshot: TaskSnapshotPayload;
    started: TaskStartedPayload;
    stopRequested: { taskId: string; runId: string };
    exited: TaskExitedPayload;
    failed: TaskFailedPayload;
};

export type TaskEventMsg<K extends TaskEventType = TaskEventType> = {
    runId: string;
    type: K;
    payload: TaskEventPayloadMap[K];
    ts: number;
};

export type TaskItemVM = {
    spec: TaskDefinition;
    runtime?: TaskRuntime; // 后端快照（可选）
    runId: string;         // 当前用于展示/订阅的 runId（active 优先）
    status: TaskRuntimeStatus["status"]; // UI 用的状态（store 优先）
};