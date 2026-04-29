import type { ApiHistoryEntityDto, ApiResponseErrorDto, ApiResponseMetricsDto } from "@yinuo-ngm/protocol";
import { ApiRequestEntity } from "./api-request.model";

export type ApiHistoryEntity = Omit<ApiHistoryEntityDto, "requestSnapshot"> & {
    requestSnapshot: ApiRequestEntity;
    resolved: ApiHistoryEntityDto["resolved"] & {
        curl?: { bash: string; powershell: string };
    };
    error?: ApiResponseErrorDto;
    metrics: ApiResponseMetricsDto;
};
