import type { SystemLogEntry } from '@yinuo-ngm/protocol';

export interface LogTailFilter {
    refId?: string;
    source?: SystemLogEntry['source'];
    level?: SystemLogEntry['level'];
    scope?: SystemLogEntry['scope'];
    data?: Record<string, unknown>;
}

export interface ILogStore {
    append(line: SystemLogEntry): void;
    tail(limit: number, filter?: LogTailFilter): SystemLogEntry[];
    clear(filter?: LogTailFilter): number;
    size(): number;
    tailById(refId: string, n: number): SystemLogEntry[];
}
