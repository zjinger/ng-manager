import type { INpmRegistry } from "./npm-registry";
import { LatestCacheKv } from "./latest-cache.kv";
// import { LatestCache } from "./latest-cache";
export class CachedNpmRegistry implements INpmRegistry {
    constructor(
        private inner: INpmRegistry,
        // private cache: LatestCache // 内存缓存
        // private cache: LatestCachePersistent// 持久化缓存
        private cache: LatestCacheKv // KV 存储缓存 ,持久化
    ) { }
    async getLatest(cwd: string, name: string): Promise<string | null> {
        const key = `npm:latest:${name}`;  // key 不需要 cwd（latest 与 cwd 无关），只与 package name 有关
        return this.cache.getOrLoad(key, () => this.inner.getLatest(cwd, name));
    }
}
