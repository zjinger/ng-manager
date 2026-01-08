import type { TaskRuntime, TaskDefinition, TaskRow } from "./task.types";

export interface TaskService {
    start(taskId: string): Promise<TaskRuntime>;
    stop(taskId: string): Promise<TaskRuntime>;
    status(taskId: string): Promise<TaskRuntime>;
    // 从 ProjectMeta 刷新 specs（并返回聚合视图，UI 直接用）
    refreshByProject(projectId: string): Promise<TaskRow[]>;
    // 聚合视图：列出某项目的 task rows（用于 UI 展示任务清单,只读查询：不触发刷新）
    listViewsByProject(projectId: string): Promise<TaskRow[]>;
    // 列出某项目的 spec（用于 UI 展示任务清单,只读查询：不触发刷新）
    listSpecsByProject(projectId: string): Promise<TaskDefinition[]>;

    getSnapshot(taskId: string): Promise<TaskRuntime | null>;
    getTailLogs(taskId: string, tail: number): Promise<any[]>; // 返回 log entry[]
}