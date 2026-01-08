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
} as const;

export type EventName = (typeof Events)[keyof typeof Events];

// payload 类型（v0.1 先最小化，后续随 task/process 落地再补全）
export type CoreEventMap = {
    [Events.PROJECT_ADDED]: { projectId: string };
    [Events.PROJECT_UPDATED]: { projectId: string };
    [Events.PROJECT_REMOVED]: { projectId: string };

    [Events.TASK_STARTED]: { taskId: string; runId: string; pid: number };
    [Events.TASK_OUTPUT]: { taskId: string; runId: string; text: string; stream: "stdout" | "stderr" };
    [Events.TASK_STOP_REQUESTED]: { taskId: string; runId: string };
    [Events.TASK_EXITED]: { taskId: string; runId: string; exitCode: number | null; signal: string | null };
    [Events.TASK_FAILED]: { taskId: string; runId: string; error: string | null };

    [Events.TASK_SPECS_REFRESHED]: { projectId: string; count: number };

    [Events.SYSLOG_APPENDED]: { entry: import("../log/types").LogLine };
};