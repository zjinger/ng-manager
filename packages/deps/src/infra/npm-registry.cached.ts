import type { INpmRegistry } from './npm-registry';
import { LatestCacheKv } from './latest-cache.kv';

export class CachedNpmRegistry implements INpmRegistry {
    constructor(
        private inner: INpmRegistry,
        private cache: LatestCacheKv
    ) { }

    async getLatest(cwd: string, name: string): Promise<string | null> {
        const key = `npm:latest:${name}`;
        return this.cache.getOrLoad(key, () => this.inner.getLatest(cwd, name));
    }
}
