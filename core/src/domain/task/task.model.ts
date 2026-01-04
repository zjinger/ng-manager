export type TaskStatus = "idle" | "running" | "stopped" | "failed";

export type TaskKind = "run" | "build" | "test" | "lint" | "custom";

export interface TaskSpec {
    id: string;
    projectId: string;
    name: string;            // "dev" / "build"
    command: string;         // 最终要执行的命令
    cwd: string;             // 一般就是 project.root
    shell?: boolean;         // 默认 true（跨平台更省事）
    env?: Record<string, string>;
}

export interface TaskRuntime {
    taskId: string;
    projectId: string;
    name: string;

    status: TaskStatus;
    pid?: number;

    startedAt?: number;
    stoppedAt?: number;

    exitCode?: number | null;
    signal?: string | null;

    lastError?: string;
}


export interface TaskView {
    spec: TaskSpec;
    runtime?: TaskRuntime; // 没运行过则为空
}

export interface TaskView {
    spec: TaskSpec;
    runtime?: TaskRuntime; // 没运行过则为空
}