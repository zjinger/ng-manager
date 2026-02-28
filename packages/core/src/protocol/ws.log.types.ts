export type SystemLogLevel = "debug" | "info" | "warn" | "error" | "success";
export type SystemLogScope =
    | "system"
    | "task"
    | "project"
    | "git"
    | "svn"
    | "sprite"
    | "fs"
    | "terminal"
    | "ai";

export type SystemLogSource =
    | "system"
    | "task" // task output
    | "server"
    | "desktop";

/**
 * SystemLogEntry（domain-facing）
 */
export interface SystemLogEntry {
    id?: string;// UUID v4
    ts: number;                 // Date.now()
    level: SystemLogLevel;          // debug | info | warn | error
    source: SystemLogSource;          // 谁写的
    scope: SystemLogScope;           // 归属范围
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

/**
 * ws log 消息的 payload
 */
export interface LogOutputPayload {
    level: SystemLogLevel;
    scope: SystemLogScope;
    /** 默认 "system" */
    source?: SystemLogSource;

    refId?: string;
    text: string;

    /** 结构化字段（stream/taskId/projectId/sourceKey...） */
    data?: Record<string, any>;
}