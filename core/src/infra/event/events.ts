import { TaskBootstrapDonePayload, TaskBootstrapFailedPayload, TaskExitedPayload, TaskFailedPayload, TaskOutputPayload, TaskStartedPayload, TaskStopRequestedPayload } from "../../protocol";
import { LogLine } from "../log/types";

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
    PROJECT_BOOTSTRAP_DONE: "PROJECT_BOOTSTRAP_DONE",
    PROJECT_BOOTSTRAP_FAILED: "PROJECT_BOOTSTRAP_FAILED",

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
};