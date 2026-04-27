import { uid } from '@yinuo-ngm/shared';
import type {
    LogOutputPayload,
    SystemLogEntry,
    SystemLogSource,
} from '@yinuo-ngm/protocol';
import type { ILogStore } from './log-store';
import type {
    SystemLogAppendHook,
    SystemLogFilter,
    SystemLogQueryOptions,
    SystemLogSubscriber,
    SystemLogSubscribeOptions,
    Unsubscribe,
} from './system-log.types';
import type { SystemLogService } from './system-log.service';

export class SystemLogServiceImpl implements SystemLogService {
    private subscribers = new Set<SystemLogSubscriber>();

    constructor(
        private readonly store: ILogStore,
        private readonly onAppend?: SystemLogAppendHook,
        private readonly defaultSource: SystemLogSource = 'system'
    ) {}

    append(payload: LogOutputPayload): SystemLogEntry {
        const entry: SystemLogEntry = {
            id: `log:${uid()}`,
            ts: Date.now(),
            level: payload.level,
            source: payload.source ?? this.defaultSource,
            scope: payload.scope,
            refId: payload.refId,
            text: payload.text,
            data: payload.data,
        };

        this.store.append(entry);
        this.onAppend?.(entry);

        for (const subscriber of Array.from(this.subscribers)) {
            subscriber(entry);
        }

        return entry;
    }

    debug(payload: Omit<LogOutputPayload, "level">) {
        return this.append({ ...payload, level: "debug" });
    }

    info(payload: Omit<LogOutputPayload, "level">) {
        return this.append({ ...payload, level: "info" });
    }

    warn(payload: Omit<LogOutputPayload, "level">) {
        return this.append({ ...payload, level: "warn" });
    }

    error(payload: Omit<LogOutputPayload, "level">) {
        return this.append({ ...payload, level: "error" });
    }

    success(payload: Omit<LogOutputPayload, "level">) {
        return this.append({ ...payload, level: "success" });
    }

    tail(limit: number, filter?: SystemLogFilter): SystemLogEntry[] {
        return this.store.tail(Math.max(0, limit | 0), this.toStoreFilter(filter)) as SystemLogEntry[];
    }

    query(filter?: SystemLogFilter, options?: SystemLogQueryOptions): SystemLogEntry[] {
        const limit = Math.max(0, (options?.limit ?? 200) | 0);
        let out = this.tail(limit, filter);

        const sinceTs = options?.sinceTs;
        const untilTs = options?.untilTs;
        if (sinceTs != null) out = out.filter((e) => e.ts >= sinceTs);
        if (untilTs != null) out = out.filter((e) => e.ts <= untilTs);

        if (out.length <= limit) return out;
        return out.slice(out.length - limit);
    }

    subscribe(subscriber: SystemLogSubscriber, options?: SystemLogSubscribeOptions): Unsubscribe {
        const filter = options?.filter;
        const replayTail = Math.max(0, (options?.replayTail ?? 0) | 0);

        if (replayTail > 0) {
            const replay = this.tail(replayTail, filter);
            for (const e of replay) subscriber(e);
        }

        this.subscribers.add(subscriber);

        return () => {
            this.subscribers.delete(subscriber);
        };
    }

    clear(filter?: SystemLogFilter): number {
        return this.store.clear(this.toStoreFilter(filter));
    }

    size(): number {
        return this.store.size();
    }

    private toStoreFilter(filter?: SystemLogFilter) {
        if (!filter) return undefined;
        return {
            refId: filter.refId,
            source: filter.source as any,
            level: filter.level as any,
            scope: filter.scope as any,
            data: filter.data,
        };
    }
}
