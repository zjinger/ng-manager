import type { LogLine } from '@yinuo-ngm/protocol';

export interface TaskLogFilter {
    refId?: string;
    source?: LogLine["source"];
    level?: LogLine["level"];
    scope?: LogLine["scope"];
    data?: Record<string, any>;
}

export interface TaskLogStore {
    append(line: LogLine): void;
    tail(limit: number, filter?: TaskLogFilter): LogLine[];
    clear(filter?: TaskLogFilter): number;
    size(): number;
    tailById(refId: string, n: number): LogLine[];
}
