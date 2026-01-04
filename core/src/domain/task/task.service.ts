import type { TaskRuntime, TaskSpec, TaskView } from "./task.model";

export interface TaskService {
    start(spec: Omit<TaskSpec, "id"> & { id?: string }): Promise<TaskRuntime>;
    stop(taskId: string): Promise<TaskRuntime>;
    status(taskId: string): Promise<TaskRuntime>;
    listByProject(projectId: string): Promise<TaskRuntime[]>;
    // 列出某项目的 spec（用于 UI 展示任务清单）
    listSpecsByProject(projectId: string): Promise<TaskSpec[]>;
    // 生成 TaskSpec（写入 specs Map，并返回）.从 Project.scripts 同步
    syncSpecsFromProjectScripts(projectId: string, rootDir: string, scripts: Record<string, string>): Promise<TaskSpec[]>;
    // 聚合视图
    listViewsByProject(projectId: string): Promise<TaskView[]>;
}