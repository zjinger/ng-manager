import type {
    LogOutputPayload,
    SystemLogEntry,
} from '@yinuo-ngm/protocol';
import type {
    SystemLogFilter,
    SystemLogQueryOptions,
    SystemLogSubscriber,
    SystemLogSubscribeOptions,
    Unsubscribe,
} from './system-log.types';

export interface SystemLogService {
    append(payload: LogOutputPayload): SystemLogEntry;
    debug(payload: Omit<LogOutputPayload, "level">): SystemLogEntry;
    info(payload: Omit<LogOutputPayload, "level">): SystemLogEntry;
    warn(payload: Omit<LogOutputPayload, "level">): SystemLogEntry;
    error(payload: Omit<LogOutputPayload, "level">): SystemLogEntry;
    success(payload: Omit<LogOutputPayload, "level">): SystemLogEntry;
    tail(limit: number, filter?: SystemLogFilter): SystemLogEntry[];
    query(filter?: SystemLogFilter, options?: SystemLogQueryOptions): SystemLogEntry[];
    subscribe(subscriber: SystemLogSubscriber, options?: SystemLogSubscribeOptions): Unsubscribe;
    clear(filter?: SystemLogFilter): number;
    size(): number;
}
