import type { TaskStatus } from "../ws.task.types";

export type TaskKindDto = "run" | "build" | "test" | "lint" | "custom";

export interface TaskDefinitionDto {
    id: string;
    projectId: string;
    projectRoot: string;
    projectName: string;
    name: string;
    kind?: TaskKindDto;
    description?: string;
    command?: string;
    file?: string;
    args?: string[];
    runnable?: boolean;
}

export interface TaskRuntimeDto {
    taskId: string;
    projectId: string;
    name?: string;
    runId: string;
    status: TaskStatus;
    pid?: number;
    startedAt?: number;
    stoppedAt?: number;
    exitCode?: number | null;
    signal?: string | null;
    lastError?: string;
}

export interface TaskRowDto {
    spec: TaskDefinitionDto;
    runtime?: TaskRuntimeDto;
}
