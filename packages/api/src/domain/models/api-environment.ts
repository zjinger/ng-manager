import { ApiCollectionScope } from "./api-collection";

export interface ApiEnvironmentEntity {
    id: string;
    name: string;
    scope: ApiCollectionScope;
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
