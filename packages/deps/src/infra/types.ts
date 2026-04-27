import type { KvRepo } from '@yinuo-ngm/storage';

export type CacheEntry = {
    value: string | null;
    expiresAt: number;
};

export type PersistedSnapshot = {
    version: 1;
    savedAt: number;
    entries: Record<string, CacheEntry>;
};

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
    ttlOkMs?: number;
    ttlFailMs?: number;
    maxSize?: number;
    flushDebounceMs?: number;
}

export interface INpmRegistry {
    getLatest(cwd: string, name: string): Promise<string | null>;
}
