import type { ApiScope } from "../models/types";
import type { ApiCollectionEntity } from "../models/api-collection";

export interface CollectionRepo {
    get(id: string, scope: ApiScope, projectId?: string): Promise<ApiCollectionEntity | null>;
    list(scope: ApiScope, projectId?: string): Promise<ApiCollectionEntity[]>;
    save(entity: ApiCollectionEntity, scope: ApiScope, projectId?: string): Promise<void>;
    delete(id: string, scope: ApiScope, projectId?: string): Promise<void>;
}
