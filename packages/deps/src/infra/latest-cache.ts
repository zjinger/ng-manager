import { CacheEntry, LatestCacheOptions } from './types';

export class LatestCache {
    private store = new Map<string, CacheEntry>();
    private inflight = new Map<string, Promise<string | null>>();

    private ttlOkMs: number;
    private ttlFailMs: number;
    private maxSize: number;

    constructor(opts: LatestCacheOptions = {}) {
        this.ttlOkMs = opts.ttlOkMs ?? 6 * 60 * 60 * 1000;
        this.ttlFailMs = opts.ttlFailMs ?? 2 * 60 * 1000;
        this.maxSize = opts.maxSize ?? 2000;
    }

    get(key: string): string | null | undefined {
        const e = this.store.get(key);
        if (!e) return undefined;
        if (Date.now() > e.expiresAt) {
            this.store.delete(key);
            return undefined;
        }
        return e.value;
    }

    setOk(key: string, value: string | null): void {
        this.set(key, value, value ? this.ttlOkMs : this.ttlFailMs);
    }

    setFail(key: string): void {
        this.set(key, null, this.ttlFailMs);
    }

    private set(key: string, value: string | null, ttlMs: number): void {
        if (this.store.size >= this.maxSize) {
            const first = this.store.keys().next().value;
            if (first) this.store.delete(first);
        }
        this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
    }

    async getOrLoad(key: string, loader: () => Promise<string | null>): Promise<string | null> {
        const cached = this.get(key);
        if (cached !== undefined) return cached;

        const inflight = this.inflight.get(key);
        if (inflight) return inflight;

        const p = (async () => {
            try {
                const v = await loader();
                this.setOk(key, v);
                return v;
            } catch {
                this.setFail(key);
                return null;
            } finally {
                this.inflight.delete(key);
            }
        })();

        this.inflight.set(key, p);
        return p;
    }

    prune(): void {
        const now = Date.now();
        for (const [k, v] of this.store.entries()) {
            if (now > v.expiresAt) this.store.delete(k);
        }
    }

    clear(): void {
        this.store.clear();
        this.inflight.clear();
    }
}
