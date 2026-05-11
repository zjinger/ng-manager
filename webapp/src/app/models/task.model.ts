import type {
    TaskDefinitionDto,
    TaskAnalyzeSummaryDto,
    TaskKindDto,
    TaskRowDto,
    TaskRuntimeDto,
    TaskStatus,
} from "@yinuo-ngm/protocol";

export type TaskKind = TaskKindDto;
export type TaskDefinition = TaskDefinitionDto;
export type TaskAnalyzeSummary = TaskAnalyzeSummaryDto;
export type TaskRuntime = TaskRuntimeDto;
export type TaskRow = TaskRowDto;

export type TaskRuntimeStatus =
    | { status: "idle" }
    | { status: "running"; pid?: number; startedAt?: number; }
    | { status: "stopping" }
    | { status: "stopped"; exitCode?: number | null; signal?: string | null; stoppedAt?: number }
    | { status: "failed"; exitCode?: number | null; signal?: string | null; stoppedAt?: number }
    | { status: "success"; exitCode?: number | null; signal?: string | null; stoppedAt?: number };
