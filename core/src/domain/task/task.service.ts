import type { TaskRuntime, TaskSpec } from "./task.model";

export interface TaskService {
    start(spec: Omit<TaskSpec, "id"> & { id?: string }): Promise<TaskRuntime>;
    stop(taskId: string): Promise<TaskRuntime>;
    status(taskId: string): Promise<TaskRuntime>;
    listByProject(projectId: string): Promise<TaskRuntime[]>;
}