export type TaskStatus =
    | "idle"
    | "running"
    | "stopping"
    | "stopped"
    | "success"
    | "failed";

export type TaskEventType =
    | "snapshot" // 全量快照
    | "started" // 任务启动
    | "stopRequested" // 请求停止
    | "exited" // 任务退出
    | "failed" // 任务失败
    | "bootstrapDone" // 任务关联的项目 bootstrap 完成
    | "bootstrapFailed"; // 任务关联的项目 bootstrap 失败

export type LogType = "stdout" | "stderr" | "system";


export type TaskSnapshotPayload = {
    taskId: string;
    projectId: string;
    runId: string;
    status: TaskStatus;
    name?: string;

    pid?: number;
    startedAt?: number;
    stoppedAt?: number;

    exitCode?: number | null;
    signal?: string | null;
};

export type TaskStartedPayload = {
    taskId: string;
    runId: string;
    startedAt: number;
    pid?: number;
    projectId?: string;
};

export type TaskStopRequestedPayload = {
    taskId: string;
    runId: string;
};

export type TaskExitedPayload = {
    taskId: string;
    runId: string;
    stoppedAt: number;
    exitCode: number | null;
    signal: string | null;
};

export type TaskFailedPayload = {
    taskId: string;
    runId: string;
    error: string;
};

export type TaskBootstrapDonePayload = {
    projectId: string;
    rootPath: string;
    taskId: string;
    runId: string;
};

export type TaskBootstrapFailedPayload = {
    taskId: string;
    runId: string;
    rootPath: string;
    reason: string;
};

export type TaskEventPayloadMap = {
    snapshot: TaskSnapshotPayload;
    started: TaskStartedPayload;
    stopRequested: TaskStopRequestedPayload;
    exited: TaskExitedPayload;
    failed: TaskFailedPayload;
    bootstrapDone: TaskBootstrapDonePayload;
    bootstrapFailed: TaskBootstrapFailedPayload;
};



export type TaskEventMsg =
    {
        [K in TaskEventType]: {
            op: "task.event";
            type: K;
            payload: TaskEventPayloadMap[K];
            ts: number;
        };
    }[TaskEventType];


export type TaskOutputPayload = {
    runId: string;
    taskId: string;
    stream: LogType;
    text: string;
};

export type TaskOutputMsg = {
    op: "task.output";
    payload: TaskOutputPayload;
    ts: number;
}