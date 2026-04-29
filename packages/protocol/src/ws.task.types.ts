export type TaskStatus =
    | "idle"
    | "running"
    | "stopping"
    | "stopped"
    | "success"
    | "failed";

export type TaskEventType =
    | "snapshot"
    | "started"
    | "stopRequested"
    | "exited"
    | "failed"
    | "bootstrapDone"
    | "bootstrapFailed"
    | "bootstrapNeedPickRoot";

export type LogStreamType = "stdout" | "stderr" | "system";

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
    projectId?: string;
};

export type TaskExitedPayload = {
    taskId: string;
    runId: string;
    stoppedAt: number;
    exitCode: number | null;
    signal: string | null;
    projectId?: string;
};

export type TaskFailedPayload = {
    taskId: string;
    runId: string;
    projectId?: string;
    error: string;
};

export type TaskBootstrapDonePayload = {
    projectId: string;
    rootPath: string;
    taskId: string;
    runId: string;
};

export type TaskBootstrapFailedPayload = {
    projectId?: string;
    taskId: string;
    runId: string;
    rootPath: string;
    reason: string;
};

export type TaskBootstrapNeedPickRootPayload = {
    taskId: string;
    runId: string;
    rootPath: string;
    projectId?: string;
    candidates: Array<{
        path: string;
        kind: "angular" | "vue";
    }>;
    reason?: string;
};

export type TaskEventPayloadMap = {
    snapshot: TaskSnapshotPayload;
    started: TaskStartedPayload;
    stopRequested: TaskStopRequestedPayload;
    exited: TaskExitedPayload;
    failed: TaskFailedPayload;
    bootstrapDone: TaskBootstrapDonePayload;
    bootstrapFailed: TaskBootstrapFailedPayload;
    bootstrapNeedPickRoot: TaskBootstrapNeedPickRootPayload;
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
    stream: LogStreamType;
    text: string;
};

export type TaskOutputMsg = {
    op: "task.output";
    payload: TaskOutputPayload;
    ts: number;
};
