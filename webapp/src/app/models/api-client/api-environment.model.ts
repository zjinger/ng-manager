import { ApiScope } from "./api-types.model";

export interface ApiEnvVariable {
    key: string;
    value: string;
    secret?: boolean;
    enabled: boolean;
    description?: string;
}

export interface ApiEnvEntity {
    id: string;
    name: string;
    scope: ApiScope;
    projectId?: string;
    variables: Array<ApiEnvVariable>;
    createdAt: number;
    updatedAt: number;
}
