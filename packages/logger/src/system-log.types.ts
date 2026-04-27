import type {
    LogOutputPayload,
    SystemLogEntry,
    SystemLogLevel,
    SystemLogScope,
    SystemLogSource,
} from '@yinuo-ngm/protocol';

export type SystemLogAppendHook = (entry: SystemLogEntry) => void;

export type SystemLogFilter = {
    refId?: string;
    source?: SystemLogSource;
    level?: SystemLogLevel;
    scope?: SystemLogScope;
    data?: Record<string, unknown>;
};

export type SystemLogQueryOptions = {
    limit?: number;
    sinceTs?: number;
    untilTs?: number;
};

export type SystemLogSubscribeOptions = {
    filter?: SystemLogFilter;
    replayTail?: number;
};

export type SystemLogSubscriber = (entry: SystemLogEntry) => void;

export type Unsubscribe = () => void;
