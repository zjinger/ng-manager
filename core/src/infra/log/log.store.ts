import type { LogLine } from "./types";

export interface LogTailFilter {
    refId?: string;
    source?: LogLine["source"];
    level?: LogLine["level"];
}

export interface ILogStore {
    /** 追加一条日志 */
    append(line: LogLine): void;

    /** 取最后 N 条（默认最新在后） */
    tail(limit: number, filter?: LogTailFilter): LogLine[];

    /** 清空日志（可按 refId/source 过滤） */
    clear(filter?: LogTailFilter): void;

    /** 当前缓存条数 */
    size(): number;
}