import type { SvnSyncDonePayload, SvnSyncFailedPayload, SvnSyncOutputPayload, SvnSyncProgressPayload, SvnSyncStartedPayload, TaskExitedPayload, TaskFailedPayload, TaskOutputPayload, TaskStartedPayload, TaskStopRequestedPayload, SystemLogEntry } from "@yinuo-ngm/protocol";
import type { BootstrapEventMap } from "@yinuo-ngm/bootstrap";

export const Events = {
    // project
    PROJECT_ADDED: "project.added",
    PROJECT_UPDATED: "project.updated",
    PROJECT_REMOVED: "project.removed",

    // task
    TASK_STARTED: "task.started",
    TASK_OUTPUT: "task.output",
    TASK_STOP_REQUESTED: "task.stopRequested",
    TASK_EXITED: "task.exited",
    TASK_FAILED: "task.failed",
    TASK_SPECS_REFRESHED: "task.specs.refreshed",

    // system / log
    SYSLOG_APPENDED: "syslog.appended",

    // svn
    SVN_SYNC_STARTED: "svn.sync.started",
    SVN_SYNC_OUTPUT: "svn.sync.output",
    SVN_SYNC_FAILED: "svn.sync.failed",
    SVN_SYNC_DONE: "svn.sync.done",
    SVN_SYNC_PROGRESS: "svn.sync.progress",

} as const;

export type EventName = (typeof Events)[keyof typeof Events];

export type CoreEventMap = BootstrapEventMap & {
    [Events.PROJECT_ADDED]: { projectId: string };
    [Events.PROJECT_UPDATED]: { projectId: string };
    [Events.PROJECT_REMOVED]: { projectId: string };

    [Events.TASK_STARTED]: TaskStartedPayload;
    [Events.TASK_OUTPUT]: TaskOutputPayload;
    [Events.TASK_STOP_REQUESTED]: TaskStopRequestedPayload;
    [Events.TASK_EXITED]: TaskExitedPayload;
    [Events.TASK_FAILED]: TaskFailedPayload;

    [Events.TASK_SPECS_REFRESHED]: { projectId: string; count: number };

    [Events.SYSLOG_APPENDED]: { entry: SystemLogEntry };

    // svn sync
    [Events.SVN_SYNC_STARTED]: SvnSyncStartedPayload;
    [Events.SVN_SYNC_OUTPUT]: SvnSyncOutputPayload;
    [Events.SVN_SYNC_FAILED]: SvnSyncFailedPayload;
    [Events.SVN_SYNC_DONE]: SvnSyncDonePayload;
    [Events.SVN_SYNC_PROGRESS]: SvnSyncProgressPayload;
};