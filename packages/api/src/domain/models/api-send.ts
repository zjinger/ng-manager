import { ApiHistoryEntity } from "./api-history";
import { ApiRequestEntity } from "./api-request";
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
};

export type SendResult = {
    historyId: string;
    response?: ApiHistoryEntity["response"];
    error?: ApiHistoryEntity["error"];
    metrics: ApiHistoryEntity["metrics"];
    curl?: {
        bash: string;
        powershell: string;
    };
};