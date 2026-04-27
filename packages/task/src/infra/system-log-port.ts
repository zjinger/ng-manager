import type { SystemLogEntry, SystemLogLevel } from '@yinuo-ngm/protocol';

export interface SystemLogFilter {
    refId?: string;
    source?: SystemLogEntry["source"];
    level?: SystemLogLevel;
    scope?: SystemLogEntry["scope"];
    data?: Record<string, any>;
}

export interface SystemLogService {
    append(payload: { level: SystemLogLevel; source: "system"; scope: "task"; refId: string; text: string; data?: any }): void;
    tail(limit: number, filter?: SystemLogFilter): SystemLogEntry[];
}
