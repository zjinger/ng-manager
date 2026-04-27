import type { LogOutputPayload, SystemLogEntry } from '@yinuo-ngm/protocol';

export interface SystemLogPort {
    append(payload: LogOutputPayload): SystemLogEntry;
    debug(payload: Omit<LogOutputPayload, 'level'>): SystemLogEntry;
    info(payload: Omit<LogOutputPayload, 'level'>): SystemLogEntry;
    warn(payload: Omit<LogOutputPayload, 'level'>): SystemLogEntry;
    error(payload: Omit<LogOutputPayload, 'level'>): SystemLogEntry;
    success(payload: Omit<LogOutputPayload, 'level'>): SystemLogEntry;
}
