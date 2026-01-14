export type LogScope =
    | "task"
    | "project"
    | "server"
    | "ws"
    | "desktop"
    | "plugin"
    | "storage"
    | "process"
    | "core";

// 日志等级
export type LogLevel = "debug" | "info" | "warn" | "error";

// 记录日志的来源
export type LogSource = "system" | "task";

export interface LogLine {
    ts: number;                 // Date.now()
    level: LogLevel;
    source: LogSource;          // 谁写的
    scope: LogScope;           // 归属范围

    /**
     * task 生命周期：refId = runId, data.taskId
     * project：refId = projectId
     * ws：refId = connId
     * server：refId = "server" 
     */
    refId?: string;             // taskId / projectId / etc
    text: string;
    data?: any;                 // 额外数据
}
