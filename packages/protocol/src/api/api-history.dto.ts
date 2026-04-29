import type { ApiScope } from "./api-common.dto";
import type { ApiRequestEntityDto } from "./api-request.dto";

export interface ListHistoryQueryDto {
    scope?: ApiScope;
    projectId?: string;
    limit?: number;
    offset?: number;
}

export interface PurgeHistoryBodyDto {
    scope: ApiScope;
    projectId?: string;
    olderThan?: number;
    maxCount?: number;
}

export interface ApiResponseMetricsDto {
    startedAt: number;
    endedAt: number;
    durationMs: number;
    dnsMs?: number;
    tcpMs?: number;
    tlsMs?: number;
    ttfbMs?: number;
}

export interface ApiResponseEntityDto {
    status: number;
    statusText?: string;
    headers: Record<string, string>;
    bodyText?: string;
    bodySize?: number;
}

export interface ApiResponseErrorDto {
    code: string;
    message: string;
}

export interface ApiHistoryEntityDto {
    id: string;
    projectId?: string;
    collectionId?: string;
    requestSnapshot: ApiRequestEntityDto;
    resolved: {
        url: string;
        headers: Record<string, string>;
    };
    response?: ApiResponseEntityDto;
    error?: ApiResponseErrorDto;
    metrics: ApiResponseMetricsDto;
    createdAt: number;
}

export interface PurgeHistoryResultDto {
    removed: number;
}