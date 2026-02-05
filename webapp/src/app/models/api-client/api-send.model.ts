import { ApiRequestEntity, } from "./api-request.model";
import { ApiResponseEntity } from "./api-response.model";
import { ApiScope } from "./api-types.model";

export type SendRequestBody = {
    scope: ApiScope;
    projectId?: string;
    requestId?: string;
    request?: ApiRequestEntity;
    envId?: string;
    projectRoot?: string;
};

export type SendResponse = {
    historyId: string;
    response?: ApiResponseEntity;
    error?: { code: string; message: string };
    metrics: { startedAt: number; endedAt: number; durationMs: number };
    curl?: { bash: string; powershell: string };
};
