import type { ApiRequestEntity } from "./api-request";

export interface ApiHistoryEntity {
    id: string; // hist_xxx
    projectId?: string;
    collectionId?: string;

    requestSnapshot: ApiRequestEntity;

    resolved: {
        url: string;
        headers: Record<string, string>;
        curl?: {
            bash: string;
            powershell: string;
        }
    };

    response?: {
        status: number;
        statusText?: string;
        headers: Record<string, string>;
        bodyText?: string;
        bodySize?: number;
    };

    error?: {
        code: string;
        message: string;
    };

    metrics: {
        startedAt: number;
        endedAt: number;
        durationMs: number;
        dnsMs?: number;
        tcpMs?: number;
        tlsMs?: number;
        ttfbMs?: number;
    };

    createdAt: number;
}
