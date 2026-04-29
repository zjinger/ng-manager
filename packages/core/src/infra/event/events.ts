import type { SvnSyncDonePayload, SvnSyncFailedPayload, SvnSyncOutputPayload, SvnSyncProgressPayload, SvnSyncStartedPayload, TaskExitedPayload, TaskFailedPayload, TaskOutputPayload, TaskStartedPayload, TaskStopRequestedPayload, SystemLogEntry } from "@yinuo-ngm/protocol";
import type { BootstrapEventMap } from "@yinuo-ngm/bootstrap";
import { TaskEvents } from "@yinuo-ngm/task";
import { SvnEvents } from "@yinuo-ngm/svn";

export const Events = {
    // project
    PROJECT_ADDED: "project.added",
    PROJECT_UPDATED: "project.updated",
    PROJECT_REMOVED: "project.removed",

    // task (引用 domain 包常量，确保值一致)
    TASK_STARTED: TaskEvents.TASK_STARTED,
    TASK_OUTPUT: TaskEvents.TASK_OUTPUT,
    TASK_STOP_REQUESTED: TaskEvents.TASK_STOP_REQUESTED,
    TASK_EXITED: TaskEvents.TASK_EXITED,
    TASK_FAILED: TaskEvents.TASK_FAILED,
    TASK_SPECS_REFRESHED: TaskEvents.TASK_SPECS_REFRESHED,

    // system / log
    SYSLOG_APPENDED: "syslog.appended",

    // svn (引用 domain 包常量，确保值一致)
    SVN_SYNC_STARTED: SvnEvents.SYNC_STARTED,
    SVN_SYNC_OUTPUT: SvnEvents.SYNC_OUTPUT,
    SVN_SYNC_FAILED: SvnEvents.SYNC_FAILED,
    SVN_SYNC_DONE: SvnEvents.SYNC_DONE,
    SVN_SYNC_PROGRESS: SvnEvents.SYNC_PROGRESS,

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