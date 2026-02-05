import { ApiCurlEntity } from "./api-curl";
import type { ApiRequestEntity } from "./api-request";
import { ApiResponseEntity, ApiResponseError, ApiResponseMetrics } from "./api-response";
export interface ApiHistoryEntity {
    id: string; // hist_xxx
    projectId?: string;
    collectionId?: string;
    requestSnapshot: ApiRequestEntity;
    resolved: {
        url: string;
        headers: Record<string, string>;
        curl?: ApiCurlEntity
    };

    response?: ApiResponseEntity;

    error?: ApiResponseError;

    metrics: ApiResponseMetrics;

    createdAt: number;
}
