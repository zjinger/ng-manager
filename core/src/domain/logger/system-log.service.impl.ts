import { uid } from "../../common/id";
import { Events, type IEventBus, type CoreEventMap } from "../../infra/event";
import type { ILogStore, LogLine, LogTailFilter } from "../../infra/log";
import type {
    SystemLogAppendInput,
    SystemLogFilter,
    SystemLogQueryOptions,
    SystemLogService,
    SystemLogSubscribeOptions,
    SystemLogSubscriber,
    Unsubscribe,
} from "./system-log.service";
import type { SystemLogEntry, SystemLogSource } from "./system-log.types";

/**
 * SystemLogServiceImpl
 * - 单一日志入口：所有 scope 都写入同一个 store（sysLog）
 * - 订阅：通过 Events.SYSLOG_APPENDED 转发
 */
export class SystemLogServiceImpl implements SystemLogService {
    constructor(
        private readonly store: ILogStore,
        private readonly events: IEventBus<CoreEventMap>,
        private readonly defaultSource: SystemLogSource = "system"
    ) { }

    append(input: SystemLogAppendInput): SystemLogEntry {
        const line: LogLine = {
            id: `log:${uid()}`,
            ts: Date.now(),
            level: input.level,
            source: input.source ?? this.defaultSource,
            scope: input.scope,
            refId: input.refId,
            text: input.text,
            data: input.data,
        };
        this.store.append(line);
        this.events.emit(Events.SYSLOG_APPENDED, { entry: line });
        return line as SystemLogEntry;
    }

    debug(input: Omit<SystemLogAppendInput, "level">) {
        return this.append({ ...input, level: "debug" });
    }
    info(input: Omit<SystemLogAppendInput, "level">) {
        return this.append({ ...input, level: "info" });
    }
    warn(input: Omit<SystemLogAppendInput, "level">) {
        return this.append({ ...input, level: "warn" });
    }
    error(input: Omit<SystemLogAppendInput, "level">) {
        return this.append({ ...input, level: "error" });
    }

    tail(limit: number, filter?: SystemLogFilter): SystemLogEntry[] {
        const lines = this.store.tail(Math.max(0, limit | 0), this.toStoreFilter(filter));
        return lines as SystemLogEntry[];
    }

    query(filter?: SystemLogFilter, options?: SystemLogQueryOptions): SystemLogEntry[] {
        const limit = Math.max(0, (options?.limit ?? 200) | 0);
        // MVP：拿最近 limit 条作为候选集
        let out = this.tail(limit, filter);

        const sinceTs = options?.sinceTs;
        const untilTs = options?.untilTs;
        if (sinceTs != null) out = out.filter((e) => e.ts >= sinceTs);
        if (untilTs != null) out = out.filter((e) => e.ts <= untilTs);

        // store.tail 已经是按时间“旧 -> 新”，此处保持不变
        if (out.length <= limit) return out;
        return out.slice(out.length - limit);
    }

    subscribe(subscriber: SystemLogSubscriber, options?: SystemLogSubscribeOptions): Unsubscribe {
        const filter = options?.filter;
        const replayTail = Math.max(0, (options?.replayTail ?? 0) | 0);

        // 1) replay：store.tail “旧 -> 新”，直接按顺序推给 subscriber
        if (replayTail > 0) {
            const replay = this.tail(replayTail, filter);
            for (const e of replay) subscriber(e);
        }

        // 2) 增量：监听 SYSLOG_APPENDED
        return this.events.on(Events.SYSLOG_APPENDED, (payload) => {
            const line = payload.entry as LogLine;

            // 过滤：依赖 store 的 matchFilter 语义
            if (filter && !this.matchLine(line, filter)) return;

            subscriber(line as SystemLogEntry);
        });
    }

    clear(filter?: SystemLogFilter): number {
        return this.store.clear(this.toStoreFilter(filter));
    }

    size(): number {
        return this.store.size();
    }

    /* --------------------------------- helpers -------------------------------- */

    private toStoreFilter(filter?: SystemLogFilter): LogTailFilter | undefined {
        if (!filter) return undefined;
        return {
            refId: filter.refId,
            source: filter.source as any,
            level: filter.level as any,
            scope: filter.scope as any,
            data: filter.data,
        };
    }

    private matchLine(line: LogLine, filter: SystemLogFilter): boolean {
        if (filter.refId !== undefined && line.refId !== filter.refId) return false;
        if (filter.source !== undefined && line.source !== filter.source) return false;
        if (filter.level !== undefined && line.level !== filter.level) return false;
        if (filter.scope !== undefined && line.scope !== filter.scope) return false;

        if (filter.data) {
            const d = (line.data ?? {}) as Record<string, any>;
            for (const [k, v] of Object.entries(filter.data)) {
                if (d[k] !== v) return false;
            }
        }
        return true;
    }
}
