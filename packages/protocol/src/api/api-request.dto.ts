import type { ApiScope, ApiHttpMethod, ApiRequestBodyMode, ApiRequestAuthType } from "./api-common.dto";

export interface ApiRequestKvDto {
    key: string;
    value: string;
    enabled: boolean;
}

export interface ApiRequestBodyDto {
    mode: ApiRequestBodyMode;
    content?: unknown;
    contentType?: string;
}

export interface ApiRequestAuthBasicDto {
    username: string;
    password: string;
}

export interface ApiRequestAuthBearerDto {
    token: string;
}

export interface ApiRequestAuthApiKeyDto {
    in: "header" | "query";
    key: string;
    value: string;
}

export interface ApiRequestAuthCookieDto {
    value: string;
}

export interface ApiRequestAuthDto {
    type: ApiRequestAuthType;
    basic?: ApiRequestAuthBasicDto;
    bearer?: ApiRequestAuthBearerDto;
    apikey?: ApiRequestAuthApiKeyDto;
    cookie?: ApiRequestAuthCookieDto;
}

export interface ApiRequestOptionsDto {
    timeoutMs?: number;
    followRedirects?: boolean;
    insecureTLS?: boolean;
    proxy?: string;
}

export interface ApiRequestEntityDto {
    id: string;
    name: string;
    method: ApiHttpMethod;
    url: string;
    query: ApiRequestKvDto[];
    pathParams?: ApiRequestKvDto[];
    headers: ApiRequestKvDto[];
    body?: ApiRequestBodyDto;
    auth?: ApiRequestAuthDto;
    options?: ApiRequestOptionsDto;
    collectionId?: string | null;
    order?: number;
    tags?: string[];
    createdAt: number;
    updatedAt: number;
}

export interface ListRequestsQueryDto {
    scope?: ApiScope;
    projectId?: string;
}

export interface SaveRequestBodyDto {
    scope: ApiScope;
    projectId?: string;
    request: ApiRequestEntityDto;
}

export interface UpdateRequestBodyDto {
    scope: ApiScope;
    projectId?: string;
    request: ApiRequestEntityDto;
}

export interface ApiRequestIdParamDto {
    id: string;
}