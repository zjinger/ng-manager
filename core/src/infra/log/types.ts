
// 日志等级
export type LogLevel = "debug" | "info" | "warn" | "error";

// 记录日志的来源
export type LogSource = "task" | "system";

export interface LogLine {
    ts: number;                 // Date.now()
    level: LogLevel;
    source: LogSource;  // 谁写的
    refId?: string;             // taskId / projectId / etc
    text: string;
}