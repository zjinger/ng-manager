import type { TaskStatus } from "../ws.task.types";

export type TaskKindDto = "run" | "serve" | "build" | "test" | "lint" | "inspect" | "custom";
export type TaskViewIdDto = "output" | "dashboard" | "analyzer";

export interface TaskViewDefinitionDto {
    id: TaskViewIdDto;
    title: string;
}

export interface TaskCapabilitiesDto {
    dashboard?: boolean;
    analyzer?: boolean;
    report?: boolean;
}

export interface TaskDefinitionDto {
    id: string;
    projectId: string;
    projectRoot: string;
    projectName: string;
    name: string;
    kind?: TaskKindDto;
    description?: string;
    command?: string;
    displayCommand?: string;
    file?: string;
    args?: string[];
    runnable?: boolean;
    views?: TaskViewDefinitionDto[];
    capabilities?: TaskCapabilitiesDto;
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
    urls?: string[];
    lastOutputAt?: number;
    readyAt?: number;
    rebuildDurationMs?: number;
    warningsCount?: number;
    errorsCount?: number;
}

export interface TaskRowDto {
    spec: TaskDefinitionDto;
    runtime?: TaskRuntimeDto;
}
