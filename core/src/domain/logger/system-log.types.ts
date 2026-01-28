import { LogLine } from "../../infra/log";

export type SystemLogLevel = "debug" | "info" | "warn" | "error" | "success";
export type SystemLogScope =
    | "system"
    | "task"
    | "project"
    | "git"
    | "fs"
    | "terminal"
    | "ai";

export type SystemLogSource =
    | "system"
    | "task" // task output
    | "server"
    | "desktop";

export interface SystemLogEntry extends LogLine {
    // 强约束 level/source/scope 的取值范围
    level: SystemLogLevel;
    source: SystemLogSource;
    scope: SystemLogScope;
}