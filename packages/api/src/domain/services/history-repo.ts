import { ApiCollectionScope } from "../models/api-collection";
import type { ApiHistoryEntity } from "../models/api-history";

export interface HistoryRepo {
    add(h: ApiHistoryEntity, scope: ApiCollectionScope, projectId?: string): Promise<void>;
    list(query: { scope: ApiCollectionScope; projectId?: string; limit: number; offset: number }): Promise<ApiHistoryEntity[]>;
    purge(query: { scope: ApiCollectionScope; projectId?: string; olderThan?: number; maxCount?: number }): Promise<number>;
}
