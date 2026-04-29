import type {
    ApiRequestAuthDto,
    ApiRequestBodyDto,
    ApiRequestBodyMode,
    ApiRequestEntityDto,
    ApiRequestKvDto,
    ApiRequestOptionsDto,
    ApiRequestAuthType,
} from "@yinuo-ngm/protocol";

export type ApiRequestKvRow = { id: string; key: string; value: string; enabled: boolean; description?: string };

export type ApiRequestEntityBodyMode = ApiRequestBodyMode;

export type ApiRequestEntityAuthType = ApiRequestAuthType;

export type ApiRequestEntityBody = ApiRequestBodyDto;

export type ApiRequestEntityAuth = ApiRequestAuthDto;

export type ApiRequestEntityOptions = ApiRequestOptionsDto;
export type ApiRequestKv = ApiRequestKvDto;
export type ApiRequestEntity = Omit<ApiRequestEntityDto, "query" | "pathParams" | "headers"> & {
    query: ApiRequestKvRow[];
    pathParams: ApiRequestKvRow[];
    headers: ApiRequestKvRow[];
};
