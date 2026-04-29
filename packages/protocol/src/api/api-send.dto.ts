import type { ApiScope } from "./api-common.dto";
import type { ApiRequestEntityDto } from "./api-request.dto";

export interface SendRequestBodyDto {
    scope?: ApiScope;
    projectId?: string;
    requestId?: string;
    request?: ApiRequestEntityDto;
    envId?: string;
    projectRoot?: string;
    useCookieJar?: boolean;
    sessionKey?: string;
    clearCookieJar?: boolean;
}

export interface SendResultDto {
    historyId: string;
    response?: import("./api-history.dto").ApiResponseEntityDto;
    error?: import("./api-history.dto").ApiResponseErrorDto;
    metrics: import("./api-history.dto").ApiResponseMetricsDto;
    curl?: unknown;
    responseSetCookies?: string[];
}