import type { KvRepo } from '@yinuo-ngm/storage';
import type { LatestCacheEntry, LatestCacheOptions, LatestCacheSnapshot } from './types';

export class LatestCacheKv {
    private store = new Map<string, LatestCacheEntry>();
    private inflight = new Map<string, Promise<string | null>>();

    private dirty = false;
    private flushTimer: NodeJS.Timeout | null = null;

    private ttlOkMs: number;
    private ttlFailMs: number;
    private maxSize: number;
    private flushDebounceMs: number;

    private pruneTimer: NodeJS.Timeout | null = null;

    constructor(
        private repo: KvRepo<LatestCacheSnapshot>,
        private snapshotId: string,
        opts: LatestCacheOptions = {}
    ) {
        this.ttlOkMs = opts.ttlOkMs ?? 6 * 60 * 60 * 1000;
        this.ttlFailMs = opts.ttlFailMs ?? 2 * 60 * 1000;
        this.maxSize = opts.maxSize ?? 2000;
        this.flushDebounceMs = opts.flushDebounceMs ?? 800;
    }

    async load(): Promise<void> {
        const snap = await this.repo.get(this.snapshotId);
        if (!snap || snap.version !== 1 || !snap.entries) return;

        const now = Date.now();
        this.store.clear();

        for (const [k, v] of Object.entries(snap.entries)) {
            if (!v || typeof v.expiresAt !== "number") continue;
            if (now > v.expiresAt) continue;
            this.store.set(k, { value: v.value ?? null, expiresAt: v.expiresAt });
        }

        this.enforceMaxSize();
    }

    async flush(): Promise<void> {
        if (!this.dirty) return;
        this.dirty = false;

        this.prune(false);

        const entries: Record<string, LatestCacheEntry> = {};
        for (const [k, v] of this.store.entries()) entries[k] = v;

        const snap: LatestCacheSnapshot = {
            version: 1,
            savedAt: Date.now(),
            entries,
        };

        await this.repo.set(this.snapshotId, snap);
    }

    get(key: string): string | null | undefined {
        const e = this.store.get(key);
        if (!e) return undefined;

        if (Date.now() > e.expiresAt) {
            this.store.delete(key);
            this.markDirtyDebounced();
            return undefined;
        }
        return e.value;
    }

    async getOrLoad(key: string, loader: () => Promise<string | null>): Promise<string | null> {
        const cached = this.get(key);
        if (cached !== undefined) return cached;

        const running = this.inflight.get(key);
        if (running) return running;

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

    setOk(key: string, value: string | null): void {
        this.set(key, value, value ? this.ttlOkMs : this.ttlFailMs);
    }

    setFail(key: string): void {
        this.set(key, null, this.ttlFailMs);
    }

    prune(markDirty = true): number {
        const now = Date.now();
        let removed = 0;

        for (const [k, v] of this.store.entries()) {
            if (now > v.expiresAt) {
                this.store.delete(k);
                removed++;
            }
        }

        if (removed > 0 && markDirty) this.markDirtyDebounced();
        return removed;
    }

    startPruneTimer(intervalMs = 10 * 60 * 1000, onPruned?: (removed: number) => void): void {
        if (this.pruneTimer) return;

        this.pruneTimer = setInterval(() => {
            const removed = this.prune(true);
            if (removed > 0) onPruned?.(removed);
        }, intervalMs);

        this.pruneTimer.unref?.();
    }

    stopPruneTimer(): void {
        if (!this.pruneTimer) return;
        clearInterval(this.pruneTimer);
        this.pruneTimer = null;
    }

    has(key: string): boolean {
        return this.get(key) !== undefined;
    }

    private set(key: string, value: string | null, ttlMs: number): void {
        if (this.store.size >= this.maxSize) {
            const first = this.store.keys().next().value;
            if (first) this.store.delete(first);
        }
        this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
        this.markDirtyDebounced();
    }

    private enforceMaxSize(): void {
        while (this.store.size > this.maxSize) {
            const first = this.store.keys().next().value;
            if (!first) break;
            this.store.delete(first);
        }
    }

    private markDirtyDebounced(): void {
        this.dirty = true;
        if (this.flushTimer) return;

        this.flushTimer = setTimeout(async () => {
            this.flushTimer = null;
            try {
                await this.flush();
            } catch {
                // ignore
            }
        }, this.flushDebounceMs);
    }
}
