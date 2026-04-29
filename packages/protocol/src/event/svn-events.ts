import type {
    SvnSyncDonePayload,
    SvnSyncFailedPayload,
    SvnSyncOutputPayload,
    SvnSyncProgressPayload,
    SvnSyncStartedPayload,
} from "../ws.svn.types";

export const SvnEvents = {
    SYNC_STARTED: "svn.sync.started",
    SYNC_OUTPUT: "svn.sync.output",
    SYNC_FAILED: "svn.sync.failed",
    SYNC_DONE: "svn.sync.done",
    SYNC_PROGRESS: "svn.sync.progress",
} as const;

export type SvnEventMap = {
    [SvnEvents.SYNC_STARTED]: SvnSyncStartedPayload;
    [SvnEvents.SYNC_OUTPUT]: SvnSyncOutputPayload;
    [SvnEvents.SYNC_FAILED]: SvnSyncFailedPayload;
    [SvnEvents.SYNC_DONE]: SvnSyncDonePayload;
    [SvnEvents.SYNC_PROGRESS]: SvnSyncProgressPayload;
};
