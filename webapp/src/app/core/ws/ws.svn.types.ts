
export type SvnSyncMode = "checkout" | "update" | "switch" | "recheckout";

export type SvnTaskStatus =
    | "idle"
    | "running"
    | "success"
    | "error"
    | "cancelled";

export type SvnEventType =
    | "started"
    | "runtime"
    | "output"
    | "failed"
    | "done"
    | "progress";

export type SvnEventPayloadMap = {
    started: SvnSyncStartedPayload;
    runtime: SvnSyncRuntimePayload;
    output: SvnSyncOutputPayload;
    failed: SvnSyncFailedPayload;
    done: SvnSyncDonePayload;
    progress: SvnSyncProgressPayload;
};

export type SvnEventMsg =
    {
        [K in SvnEventType]: {
            op: "svn.event";
            type: K;
            payload: SvnEventPayloadMap[K];
            ts: number;
        };
    }[SvnEventType];

export type SvnSyncStartedPayload = {
    projectId: string;
    sourceId: string;
    status: SvnTaskStatus;
};

export type SvnSyncOutputPayload = {
    projectId: string;
    sourceId: string;
    type: "stdout" | "stderr";
    data: string;
    status: SvnTaskStatus;
};

export type SvnSyncFailedPayload = {
    projectId: string;
    sourceId: string;
    error: string;
    updatedAt: string;
    status: SvnTaskStatus;
};

export type SvnSyncDonePayload = {
    projectId: string;
    sourceId: string;
    mode: SvnSyncMode;
    desiredUrl: string;
    currentUrl: string;
    updatedAt: string;
    status: SvnTaskStatus;
};

export type SvnSyncProgressPayload = {
    projectId: string;
    sourceId: string;
    total?: number;        // 0/undefined 表示未知
    changed: number;
    percent?: number;      // total 已知才有
    status: SvnTaskStatus;
}

export type SvnSyncRuntimePayload = {
    projectId: string;
    sourceId: string;
    lastSyncAt?: string;
    lastSyncMode?: SvnSyncMode;
    desiredUrl?: string;
    currentUrl?: string;
    lastStdout?: string;
    lastStderr?: string;
}

export type SpriteStreamFilter = {
    projectId?: string;
    sourceId?: string; // icons/misc/sprite 等你自己定义
};

export type SpriteLogLine = {
    ts: number;
    stream: "stdout" | "stderr";
    text: string;
};

export type SpriteProgress = {
    total: number;          // 0 表示未知
    changed: number;
    percent?: number;       // total>0 才有
    indeterminate: boolean; // total=0
};