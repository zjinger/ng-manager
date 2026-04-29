import { BootstrapEvents } from "./bootstrap-events";
import { NginxEvents } from "./nginx-events";
import { ProjectEvents } from "./project-events";
import { SvnEvents } from "./svn-events";
import { SystemEvents } from "./system-events";
import { TaskEvents } from "./task-events";

export const Events = {
    // project
    PROJECT_ADDED: ProjectEvents.ADDED,
    PROJECT_UPDATED: ProjectEvents.UPDATED,
    PROJECT_REMOVED: ProjectEvents.REMOVED,

    // task
    TASK_STARTED: TaskEvents.TASK_STARTED,
    TASK_OUTPUT: TaskEvents.TASK_OUTPUT,
    TASK_STOP_REQUESTED: TaskEvents.TASK_STOP_REQUESTED,
    TASK_EXITED: TaskEvents.TASK_EXITED,
    TASK_FAILED: TaskEvents.TASK_FAILED,
    TASK_SPECS_REFRESHED: TaskEvents.TASK_SPECS_REFRESHED,

    // bootstrap
    BOOTSTRAP_DONE: BootstrapEvents.DONE,
    BOOTSTRAP_FAILED: BootstrapEvents.FAILED,
    BOOTSTRAP_NEED_PICK_ROOT: BootstrapEvents.NEED_PICK_ROOT,

    // system / log
    SYSLOG_APPENDED: SystemEvents.SYSLOG_APPENDED,

    // svn
    SVN_SYNC_STARTED: SvnEvents.SYNC_STARTED,
    SVN_SYNC_OUTPUT: SvnEvents.SYNC_OUTPUT,
    SVN_SYNC_FAILED: SvnEvents.SYNC_FAILED,
    SVN_SYNC_DONE: SvnEvents.SYNC_DONE,
    SVN_SYNC_PROGRESS: SvnEvents.SYNC_PROGRESS,

    // nginx
    NGINX_LOG_APPENDED: NginxEvents.LOG_APPENDED,
} as const;

export type EventName = (typeof Events)[keyof typeof Events];
