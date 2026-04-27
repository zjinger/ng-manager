import type { TaskExitedPayload, TaskFailedPayload, TaskOutputPayload, TaskStartedPayload, TaskStopRequestedPayload } from '@yinuo-ngm/protocol';

export const TaskEvents = {
    TASK_STARTED: "task.started",
    TASK_OUTPUT: "task.output",
    TASK_STOP_REQUESTED: "task.stopRequested",
    TASK_EXITED: "task.exited",
    TASK_FAILED: "task.failed",
    TASK_SPECS_REFRESHED: "task.specs.refreshed",
} as const;

export type TaskEventMap = {
    [TaskEvents.TASK_STARTED]: TaskStartedPayload;
    [TaskEvents.TASK_OUTPUT]: TaskOutputPayload;
    [TaskEvents.TASK_STOP_REQUESTED]: TaskStopRequestedPayload;
    [TaskEvents.TASK_EXITED]: TaskExitedPayload;
    [TaskEvents.TASK_FAILED]: TaskFailedPayload;
    [TaskEvents.TASK_SPECS_REFRESHED]: { projectId: string; count: number };
};
