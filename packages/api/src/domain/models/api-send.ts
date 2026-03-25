import { ApiCurlEntity } from "./api-curl";
import { ApiRequestEntity } from "./api-request";
import { ApiResponseEntity, ApiResponseError, ApiResponseMetrics } from "./api-response";
import { ApiScope } from "./types";

export type SendDto = {
    scope: ApiScope;
    projectId?: string;
    // 二选一：requestId 或 request
    requestId?: string;
    request?: ApiRequestEntity;
    envId?: string;
    // 可选：提供 projectRoot 等上下文
    projectRoot?: string;
    // 运行时注入的请求头（不会落库）
    runtimeHeaders?: Record<string, string>;
};

export type SendResult = {
    historyId: string;
    response?: ApiResponseEntity;
    error?: ApiResponseError;
    metrics: ApiResponseMetrics;
    curl?: ApiCurlEntity;
    responseSetCookies?: string[];
};
