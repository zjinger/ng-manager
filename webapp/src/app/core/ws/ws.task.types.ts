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
    | "failed"; // 任务失败

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
    startedAt: number;
    runId: string;
    pid?: number;
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

export type TaskEventPayloadMap = {
    snapshot: TaskSnapshotPayload;
    started: TaskStartedPayload;
    stopRequested: TaskStopRequestedPayload;
    exited: TaskExitedPayload;
    failed: TaskFailedPayload;
};

export type TaskEventMsg =
    {
        [K in TaskEventType]: {
            op: "task.event";
            runId: string;
            taskId: string;
            type: K;
            payload: TaskEventPayloadMap[K];
            ts: number;
        };
    }[TaskEventType];
