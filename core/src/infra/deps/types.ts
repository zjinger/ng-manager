
/*------------------------------ cache/persistent : deprecated ------------------------------*/
export type CacheEntry = {
    value: string | null;
    expiresAt: number;
};


export type PersistedSnapshot = {
    version: 1;
    savedAt: number;
    entries: Record<string, CacheEntry>;
};

/*------------------------------ cache/latest-cache ------------------------------*/
export type LatestCacheEntry = {
    value: string | null;
    expiresAt: number;
};

export type LatestCacheSnapshot = {
    version: 1;
    savedAt: number;
    entries: Record<string, LatestCacheEntry>;
};

export interface LatestCacheOptions {
    /** 
     * 成功时 TTL（ms）
     * default 6 hours
     */
    ttlOkMs?: number;
    /** 
     * 失败/离线时 TTL（ms）
     * default 2 minutes
     */
    ttlFailMs?: number;
    /** 
     * 最大缓存条目数（简单兜底，避免无限增长）
     * default 2000
     */
    maxSize?: number;

    /** 
     * 持久化写盘防抖时间（ms）
     * default 800ms
     */
    flushDebounceMs?: number;
}