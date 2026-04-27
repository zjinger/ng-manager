// core/src/domain/log/system-log.service.ts

import type { LogOutputPayload, SystemLogEntry, SystemLogLevel, SystemLogScope, SystemLogSource } from "@yinuo-ngm/protocol";

/**
 * 用于 tail/query 的过滤器
 */
export interface SystemLogFilter {
    refId?: string;
    source?: SystemLogSource;
    level?: SystemLogLevel;
    scope?: SystemLogScope;
    data?: Record<string, any>; // 等值匹配
}

/**
 * query 的选项
 */
export interface SystemLogQueryOptions {
    limit?: number;      // default 200
    sinceTs?: number;    // >= sinceTs
    untilTs?: number;    // <= untilTs
}
/**
 * 订阅增量日志（用于 WS 推送 / UI 实时刷新）
 */
export interface SystemLogSubscribeOptions {
    filter?: SystemLogFilter;
    replayTail?: number; // 订阅前先回放最近 N 条（默认 0）
}

/**
 * 订阅回调：store.tail 默认“最新在后”，所以订阅回放也是“旧 -> 新” 
 */
export type SystemLogSubscriber = (entry: SystemLogEntry) => void;
export interface Unsubscribe { (): void; }

/**
 * SystemLogService（domain-facing）
 * - Core 内部统一写入（task/project/git/...）
 * - UI/Server 统一读取（tail/query/subscribe）
 */
export interface SystemLogService {
    /** 追加一条日志，返回最终 entry（包含 id/ts 等） */
    append(payload: LogOutputPayload): SystemLogEntry;

    /** 便捷方法 */
    debug(payload: Omit<LogOutputPayload, "level">): SystemLogEntry;
    info(payload: Omit<LogOutputPayload, "level">): SystemLogEntry;
    warn(payload: Omit<LogOutputPayload, "level">): SystemLogEntry;
    error(payload: Omit<LogOutputPayload, "level">): SystemLogEntry;
    success(payload: Omit<LogOutputPayload, "level">): SystemLogEntry;

    /**
     *  最近 N 条（最新在后）
     */
    tail(limit: number, filter?: SystemLogFilter): SystemLogEntry[];

    /**
     * 查询（MVP：基于 tail + 时间窗过滤；后续 store 可以索引优化）
     */
    query(filter?: SystemLogFilter, options?: SystemLogQueryOptions): SystemLogEntry[];

    /**
     * 订阅增量
     * - 用于 server/ws 推送、UI 实时展示
     */
    subscribe(subscriber: SystemLogSubscriber, options?: SystemLogSubscribeOptions): Unsubscribe;

    /**清空（可选，仅用于 dev 或用户手动操作） 透传 store.clear */
    clear(filter?: SystemLogFilter): number;

    /** 当前日志条数 透传 store.size */
    size(): number;
}
