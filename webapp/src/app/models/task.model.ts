export type TaskStatus = "idle" | "running" | "success" | "error" | "stopped";

export interface TaskDefinition {
    id: string;        // dev:serve
    name: string;      // 启动前端
    group?: string;    // frontend/backend/tools
    command?: string;  // UI可展示（可选）
}

export interface TaskRuntime {
    taskId: string;
    status: TaskStatus;
    pid?: number;
    startTime?: number;
    endTime?: number;
}

export interface TaskRow {
    def: TaskDefinition;
    rt: TaskRuntime;
}

export type LogType = "stdout" | "stderr" | "system";

export interface TaskLogLine {
    taskId: string;
    type: LogType;
    message: string;
    time: number;
}
