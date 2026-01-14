import { TaskStatus } from "@core/ws";

export type TaskKind = "run" | "build" | "test" | "lint" | "custom";
export interface TaskDefinition {
    id: string;        // dev:serve
    projectId: string; // 所属项目 ID
    projectRoot: string;
    projectName: string;
    name: string;      // 启动前端
    command?: string;  // 展示用的命令行
    kind?: TaskKind;
    description?: string;
    runnable?: boolean; // 是否可运行（默认 true）
}
export interface TaskRuntime {
    taskId: string;
    projectId: string;
    runId: string;
    status: TaskStatus;
    pid?: number;
    startedAt?: number;
    stoppedAt?: number;
    exitCode?: number | null;
    signal?: string | null;
}

export interface TaskRow {
    spec: TaskDefinition;
    runtime?: TaskRuntime;
}

export type TaskRuntimeStatus =
    | { status: "idle" }
    | { status: "running"; pid?: number; startedAt?: number; }
    | { status: "stopping" }
    | { status: "stopped"; exitCode?: number | null; signal?: string | null; stoppedAt?: number };
