import { ApiScope } from "./types";

export interface ApiEnvironmentEntity {
    id: string;
    name: string;
    scope: ApiScope;
    projectId?: string;
    variables: Array<{
        key: string;
        value: string;
        secret?: boolean;
        enabled: boolean;
    }>;
    createdAt: number;
    updatedAt: number;
}
