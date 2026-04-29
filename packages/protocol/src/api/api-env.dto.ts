import type { ApiScope } from "./api-common.dto";

export interface ApiEnvironmentVariableDto {
    key: string;
    value: string;
    secret?: boolean;
    enabled: boolean;
}

export interface ApiEnvironmentEntityDto {
    id: string;
    name: string;
    scope: ApiScope;
    projectId?: string;
    baseUrl?: string;
    variables: ApiEnvironmentVariableDto[];
    createdAt: number;
    updatedAt: number;
}

export interface ListEnvsQueryDto {
    scope?: ApiScope;
    projectId?: string;
}

export interface SaveEnvBodyDto {
    scope: ApiScope;
    projectId?: string;
    env: ApiEnvironmentEntityDto;
}

export interface EnvIdParamDto {
    id: string;
}