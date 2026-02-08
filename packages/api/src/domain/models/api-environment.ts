import { ApiScope } from "./types";

export interface ApiEnvironmentVariable {
    key: string;
    value: string;
    secret?: boolean;
    enabled: boolean;
}

export interface ApiEnvironmentEntity {
    id: string;
    name: string;
    scope: ApiScope;
    projectId?: string;
    baseUrl?: string; // 前置URL
    variables: Array<ApiEnvironmentVariable>;
    createdAt: number;
    updatedAt: number;
}
