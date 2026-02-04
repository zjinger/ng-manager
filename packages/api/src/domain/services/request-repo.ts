import { ApiCollectionScope } from "../models";
import type { ApiRequestEntity } from "../models/api-request";

export interface RequestRepo {
    list(scope: ApiCollectionScope, projectId?: string): Promise<ApiRequestEntity[]>;
    get(id: string, scope: ApiCollectionScope, projectId?: string): Promise<ApiRequestEntity | null>;
    save(req: ApiRequestEntity, scope: ApiCollectionScope, projectId?: string): Promise<void>;
    remove(id: string, scope: ApiCollectionScope, projectId?: string): Promise<void>;
}
