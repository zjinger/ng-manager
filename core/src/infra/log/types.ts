
// 日志等级
export type LogLevel = "debug" | "info" | "warn" | "error";

// 记录日志的来源
export type LogSource = "system" | "task" | "process" | "storage" | "core";
// export type LogSource =
//     | { type: "system" }
//     | { type: "task"; taskId: string }
//     | { type: "process"; pid: number }
//     | { type: "custom"; name: string };

export interface LogLine {
    ts: number;                 // Date.now()
    level: LogLevel;
    source: LogSource;          // 谁写的
    refId?: string;             // taskId / projectId / etc
    text: string;
    data?: any;                 // 额外数据
}
