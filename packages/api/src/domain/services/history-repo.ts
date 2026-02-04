import type { ApiScope, ApiHistoryEntity } from "../models";

export interface HistoryRepo {
    add(h: ApiHistoryEntity, scope: ApiScope, projectId?: string): Promise<void>;
    list(query: { scope: ApiScope; projectId?: string; limit: number; offset: number }): Promise<ApiHistoryEntity[]>;
    purge(query: { scope: ApiScope; projectId?: string; olderThan?: number; maxCount?: number }): Promise<number>;
}
