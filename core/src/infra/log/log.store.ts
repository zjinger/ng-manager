import type { LogLine } from "./log.types";

export interface LogTailFilter {
    refId?: string;
    source?: LogLine["source"];
    level?: LogLine["level"];
    scope?: LogLine["scope"];
    data?: Record<string, any>;
}

export interface ILogStore {
    /** 追加一条日志 */
    append(line: LogLine): void;

    /** 取最后 N 条（默认最新在后） */
    tail(limit: number, filter?: LogTailFilter): LogLine[];

    /** 清空日志（可按 refId/source 过滤） */
    clear(filter?: LogTailFilter): number;

    /** 当前缓存条数 */
    size(): number;

    tailById(refId: string, n: number): LogLine[];
}