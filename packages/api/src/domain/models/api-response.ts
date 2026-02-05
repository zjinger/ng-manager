export interface ApiResponseEntity {
    status: number;
    statusText?: string;
    headers: Record<string, string>;
    bodyText?: string;
    bodySize?: number;
}

export interface ApiResponseMetrics {
    startedAt: number;
    endedAt: number;
    durationMs: number;
    dnsMs?: number;
    tcpMs?: number;
    tlsMs?: number;
    ttfbMs?: number;
}

export interface ApiResponseError {
    code: string;
    message: string;
}