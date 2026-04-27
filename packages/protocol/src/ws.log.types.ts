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
    | "ai"
    | "node-version";

export type SystemLogSource =
    | "system"
    | "task"
    | "server"
    | "desktop"
    | "web";

export interface SystemLogEntry {
    id?: string;
    ts: number;
    level: SystemLogLevel;
    source: SystemLogSource;
    scope: SystemLogScope;
    refId?: string;
    text: string;
    data?: any;
}

export interface LogLine extends SystemLogEntry { }

export interface LogOutputPayload {
    level: SystemLogLevel;
    scope: SystemLogScope;
    source?: SystemLogSource;
    refId?: string;
    text: string;
    data?: Record<string, any>;
}
