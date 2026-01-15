import * as fs from "fs";
import * as path from "path";
import { CacheEntry, LatestCacheOptions, PersistedSnapshot } from "./types";


function safeJsonParse<T>(raw: string): T | null {
    try {
        return JSON.parse(raw) as T;
    } catch {
        return null;
    }
}

/**
 * @deprecated 请使用 LatestCacheKv
 * LatestCachePersistent
 * - 内存 Map + 磁盘 JSON 快照
 * - 写入采用 temp + rename，降低损坏风险
 */
export class LatestCachePersistent {
    private store = new Map<string, CacheEntry>();
    private inflight = new Map<string, Promise<string | null>>();

    private ttlOkMs: number;
    private ttlFailMs: number;
    private maxSize: number;

    private flushDebounceMs: number;
    private flushTimer: NodeJS.Timeout | null = null;
    private dirty = false;

    constructor(
        private filePath: string,
        opts: LatestCacheOptions = {}
    ) {
        this.ttlOkMs = opts.ttlOkMs ?? 6 * 60 * 60 * 1000;
        this.ttlFailMs = opts.ttlFailMs ?? 2 * 60 * 1000;
        this.maxSize = opts.maxSize ?? 2000;
        this.flushDebounceMs = opts.flushDebounceMs ?? 800;
    }

    /* ----------------- public API ----------------- */

    /** 启动时调用：加载磁盘快照到内存，并 prune 过期 */
    loadFromDisk(): void {
        const dir = path.dirname(this.filePath);
        try {
            fs.mkdirSync(dir, { recursive: true });
        } catch { /* ignore */ }

        if (!fs.existsSync(this.filePath)) return;

        try {
            const raw = fs.readFileSync(this.filePath, "utf-8");
            const snap = safeJsonParse<PersistedSnapshot>(raw);
            if (!snap || snap.version !== 1 || !snap.entries) return;

            this.store.clear();
            const now = Date.now();

            for (const [k, v] of Object.entries(snap.entries)) {
                if (!v || typeof v.expiresAt !== "number") continue;
                if (now > v.expiresAt) continue;
                this.store.set(k, { value: v.value ?? null, expiresAt: v.expiresAt });
            }

            // 兜底 size
            this.enforceMaxSize();
        } catch {
            // 文件坏了就忽略（不崩服务）
            return;
        }
    }

    /** 关闭应用/服务退出前可调用：强制落盘 */
    async flushToDisk(): Promise<void> {
        if (!this.dirty) return;
        this.dirty = false;

        // prune 过期
        this.prune();

        const entries: Record<string, CacheEntry> = {};
        for (const [k, v] of this.store.entries()) entries[k] = v;

        const snap: PersistedSnapshot = {
            version: 1,
            savedAt: Date.now(),
            entries,
        };

        const dir = path.dirname(this.filePath);
        try {
            fs.mkdirSync(dir, { recursive: true });
        } catch { /* ignore */ }

        const tmp = `${this.filePath}.tmp`;
        const content = JSON.stringify(snap);

        // temp write + rename（尽量原子）
        fs.writeFileSync(tmp, content, "utf-8");
        fs.renameSync(tmp, this.filePath);
    }

    /** 获取缓存；undefined 表示未命中 */
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

    /** 并发去重：同 key 同时请求只执行一次 loader */
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

    setOk(key: string, value: string | null): void {
        this.set(key, value, value ? this.ttlOkMs : this.ttlFailMs);
    }

    setFail(key: string): void {
        this.set(key, null, this.ttlFailMs);
    }

    prune(): void {
        const now = Date.now();
        let changed = false;
        for (const [k, v] of this.store.entries()) {
            if (now > v.expiresAt) {
                this.store.delete(k);
                changed = true;
            }
        }
        if (changed) this.markDirtyDebounced();
    }

    clear(): void {
        this.store.clear();
        this.inflight.clear();
        this.markDirtyDebounced();
    }

    /* ----------------- internals ----------------- */

    private set(key: string, value: string | null, ttlMs: number): void {
        // 超上限时删最早插入的（Map iteration order）
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
                await this.flushToDisk();
            } catch {
                // 落盘失败不影响主流程，下次再试
            }
        }, this.flushDebounceMs);
    }
}
