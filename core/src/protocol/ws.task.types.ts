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
    | "failed";

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
    pid?: number;
};

export type TaskStopRequestedPayload = {
    taskId: string;
    runId: string;
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
    stopRequested: TaskStopRequestedPayload;
    exited: TaskExitedPayload;
    failed: TaskFailedPayload;
};

export type TaskEventMsg =
    {
        [K in TaskEventType]: {
            op: "task.event";
            runId: string;
            type: K;
            payload: TaskEventPayloadMap[K];
            ts: number;
        };
    }[TaskEventType];
