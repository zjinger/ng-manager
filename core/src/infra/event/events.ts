export const Events = {
    // project
    PROJECT_ADDED: "project.added",
    PROJECT_UPDATED: "project.updated",
    PROJECT_REMOVED: "project.removed",

    // task
    TASK_STARTED: "task.started",
    TASK_OUTPUT: "task.output",
    TASK_STOPPED: "task.stopped",
    TASK_EXITED: "task.exited",
    TASK_FAILED: "task.failed",
    TASK_SPECS_REFRESHED: "task.specs.refreshed",

    // system / log
    LOG_APPENDED: "log.appended",
} as const;

export type EventName = (typeof Events)[keyof typeof Events];

// payload 类型（v0.1 先最小化，后续随 task/process 落地再补全）
export type CoreEventMap = {
    [Events.PROJECT_ADDED]: { projectId: string };
    [Events.PROJECT_UPDATED]: { projectId: string };
    [Events.PROJECT_REMOVED]: { projectId: string };

    [Events.TASK_STARTED]: { taskId: string; pid: number };
    [Events.TASK_OUTPUT]: { taskId: string; text: string; stream?: "stdout" | "stderr" };
    [Events.TASK_STOPPED]: { taskId: string };
    [Events.TASK_EXITED]: { taskId: string; exitCode: number | null; signal: string | null };
    [Events.TASK_FAILED]: { taskId: string; error: string | null };
    [Events.TASK_SPECS_REFRESHED]: { projectId: string; count: number };

    [Events.LOG_APPENDED]: { refId?: string };
};