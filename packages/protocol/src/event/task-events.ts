import type {
    TaskExitedPayload,
    TaskFailedPayload,
    TaskOutputPayload,
    TaskStartedPayload,
    TaskStopRequestedPayload,
    TaskAnalyzeStartedPayload,
    TaskAnalyzeFinishedPayload,
    TaskAnalyzeFailedPayload,
    TaskSnapshotPayload,
} from "../ws.task.types";

export const TaskEvents = {
    TASK_STARTED: "task.started",
    TASK_OUTPUT: "task.output",
    TASK_STOP_REQUESTED: "task.stopRequested",
    TASK_EXITED: "task.exited",
    TASK_FAILED: "task.failed",
    TASK_ANALYZE_STARTED: "task.analyze.started",
    TASK_ANALYZE_FINISHED: "task.analyze.finished",
    TASK_ANALYZE_FAILED: "task.analyze.failed",
    TASK_RUNTIME_UPDATED: "task.runtime.updated",
    TASK_SPECS_REFRESHED: "task.specs.refreshed",
} as const;

export type TaskEventMap = {
    [TaskEvents.TASK_STARTED]: TaskStartedPayload;
    [TaskEvents.TASK_OUTPUT]: TaskOutputPayload;
    [TaskEvents.TASK_STOP_REQUESTED]: TaskStopRequestedPayload;
    [TaskEvents.TASK_EXITED]: TaskExitedPayload;
    [TaskEvents.TASK_FAILED]: TaskFailedPayload;
    [TaskEvents.TASK_ANALYZE_STARTED]: TaskAnalyzeStartedPayload;
    [TaskEvents.TASK_ANALYZE_FINISHED]: TaskAnalyzeFinishedPayload;
    [TaskEvents.TASK_ANALYZE_FAILED]: TaskAnalyzeFailedPayload;
    [TaskEvents.TASK_RUNTIME_UPDATED]: TaskSnapshotPayload;
    [TaskEvents.TASK_SPECS_REFRESHED]: { projectId: string; count: number };
};
