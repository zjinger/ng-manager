import { SvnSyncDonePayload, SvnSyncFailedPayload, SvnSyncOutputPayload, SvnSyncProgressPayload, SvnSyncStartedPayload, TaskBootstrapDonePayload, TaskBootstrapFailedPayload, TaskBootstrapNeedPickRootPayload, TaskExitedPayload, TaskFailedPayload, TaskOutputPayload, TaskStartedPayload, TaskStopRequestedPayload } from "../../protocol";
import { LogLine } from "../log/log.types";

export const Events = {
    // project
    PROJECT_ADDED: "project.added",
    PROJECT_UPDATED: "project.updated",
    PROJECT_REMOVED: "project.removed",

    // task
    TASK_STARTED: "task.started",          // run started
    TASK_OUTPUT: "task.output",            // run output
    TASK_STOP_REQUESTED: "task.stopRequested", // stop requested 
    TASK_EXITED: "task.exited",            // run exited    
    TASK_FAILED: "task.failed",            // run failed (start error etc)
    TASK_SPECS_REFRESHED: "task.specs.refreshed", // specs refreshed from project

    // system / log
    SYSLOG_APPENDED: "syslog.appended",

    // bootstrap
    PROJECT_BOOTSTRAP_DONE: "project.bootstrap.done", // 创建成功
    PROJECT_BOOTSTRAP_FAILED: "project.bootstrap.failed", // 创建失败
    PROJECT_BOOTSTRAP_NEED_PICK_ROOT: "project.bootstrap.needPickRoot",  // 需要用户选择根目录

    // svn
    SVN_SYNC_STARTED: "svn.sync.started",
    SVN_SYNC_OUTPUT: "svn.sync.output",
    SVN_SYNC_FAILED: "svn.sync.failed",
    SVN_SYNC_DONE: "svn.sync.done",
    SVN_SYNC_PROGRESS: "svn.sync.progress",

} as const;

export type EventName = (typeof Events)[keyof typeof Events];

// payload 类型
export type CoreEventMap = {
    [Events.PROJECT_ADDED]: { projectId: string };
    [Events.PROJECT_UPDATED]: { projectId: string };
    [Events.PROJECT_REMOVED]: { projectId: string };

    [Events.TASK_STARTED]: TaskStartedPayload;
    [Events.TASK_OUTPUT]: TaskOutputPayload;  //{ taskId: string; runId: string; text: string; stream: "stdout" | "stderr" };
    [Events.TASK_STOP_REQUESTED]: TaskStopRequestedPayload;// { taskId: string; runId: string };
    [Events.TASK_EXITED]: TaskExitedPayload,  //{ taskId: string; runId: string; stoppedAt: number; exitCode: number | null; signal: string | null };
    [Events.TASK_FAILED]: TaskFailedPayload,  //{ taskId: string; runId: string; error: string | null };

    [Events.TASK_SPECS_REFRESHED]: { projectId: string; count: number };

    [Events.SYSLOG_APPENDED]: { entry: LogLine };

    [Events.PROJECT_BOOTSTRAP_DONE]: TaskBootstrapDonePayload;// { taskId: string; runId: string; projectId: string; rootPath: string };
    [Events.PROJECT_BOOTSTRAP_FAILED]: TaskBootstrapFailedPayload;// { taskId: string; runId: string; rootPath: string; reason: string };
    [Events.PROJECT_BOOTSTRAP_NEED_PICK_ROOT]: TaskBootstrapNeedPickRootPayload;

    // svn sync 相关事件
    [Events.SVN_SYNC_STARTED]: SvnSyncStartedPayload;
    [Events.SVN_SYNC_OUTPUT]: SvnSyncOutputPayload;
    [Events.SVN_SYNC_FAILED]: SvnSyncFailedPayload;
    [Events.SVN_SYNC_DONE]: SvnSyncDonePayload;
    [Events.SVN_SYNC_PROGRESS]: SvnSyncProgressPayload;
};