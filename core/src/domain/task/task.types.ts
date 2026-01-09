export type TaskRunStatus = "idle" | "running" | "stopping" | "success" | "failed" | "stopped";
export type TaskKind = "run" | "build" | "test" | "lint" | "custom";
// export type TaskRunMode = "daemon" | "oneshot";
export interface TaskDefinition {
    id: string;
    projectId: string;
    name: string;            // "dev" / "build"
    kind?: TaskKind;
    description?: string;

    // task 执行信息
    // 仅task of kind "run"/"build"/"test"/"lint"/"custom" 有效：
    command?: string;           // 如果时desc ,则可无command
    file?: string;              // 可选，指向一个脚本文件
    args?: string[];            // 可选，附加参数
    runnable?: boolean;         // 默认 true
    cwd?: string;               // 一般就是 project.root
    shell?: boolean;            // 默认 true（跨平台更省事）
    env?: Record<string, string>;
    // 任务运行模式：daemon（持续运行型）/oneshot（执行完即退出型，适合 build/test/lint 等）
    // mode?: TaskRunMode;

}
export interface TaskRuntime {
    taskId: string;         // spec.id
    projectId: string;
    name: string;

    runId: string;          // NEW: execution session id
    status: TaskRunStatus;

    pid?: number;
    startedAt?: number;
    stoppedAt?: number;

    exitCode?: number | null;
    signal?: string | null;

    lastError?: string;
}
export interface TaskRow {
    spec: TaskDefinition;
    runtime?: TaskRuntime; // 没运行过则为空
}
