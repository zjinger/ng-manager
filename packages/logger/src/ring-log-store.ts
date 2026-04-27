import { CoreError, CoreErrorCodes } from '@yinuo-ngm/errors';
import type { ILogStore, LogTailFilter } from './log-store';
import type { SystemLogEntry } from '@yinuo-ngm/protocol';

function matchFilter(line: SystemLogEntry, filter?: LogTailFilter) {
    if (!filter) return true;
    if (filter.refId !== undefined && line.refId !== filter.refId) return false;
    if (filter.source !== undefined && line.source !== filter.source) return false;
    if (filter.level !== undefined && line.level !== filter.level) return false;
    if (filter.scope !== undefined && line.scope !== filter.scope) return false;

    if (filter.data) {
        const d = (line.data ?? {}) as Record<string, unknown>;
        for (const [k, v] of Object.entries(filter.data)) {
            if (d[k] !== v) return false;
        }
    }
    return true;
}

export class RingLogStore implements ILogStore {
    private buf: Array<SystemLogEntry | undefined>;
    private cap: number;
    private head = 0;
    private len = 0;

    constructor(capacity = 2000) {
        if (!Number.isFinite(capacity) || capacity <= 0) {
            throw new CoreError(CoreErrorCodes.INVALID_NAME, "RingLogStore capacity must be > 0");
        }
        this.cap = Math.floor(capacity);
        this.buf = new Array(this.cap);
    }

    append(line: SystemLogEntry): void {
        this.buf[this.head] = line;
        this.head = (this.head + 1) % this.cap;
        if (this.len < this.cap) this.len++;
    }

    tail(limit: number, filter?: LogTailFilter): SystemLogEntry[] {
        const lim = Math.max(0, Math.floor(limit));
        if (lim === 0 || this.len === 0) return [];

        const out: SystemLogEntry[] = [];
        const start = (this.head - this.len + this.cap) % this.cap;

        for (let i = 0; i < this.len; i++) {
            const idx = (start + i) % this.cap;
            const line = this.buf[idx];
            if (!line) continue;
            if (!matchFilter(line, filter)) continue;
            out.push(line);
        }

        if (out.length <= lim) return out;
        return out.slice(out.length - lim);
    }

    tailById(refId: string, n: number): SystemLogEntry[] {
        return this.tail(n, { refId });
    }

    clear(filter?: LogTailFilter): number {
        let len = this.len;
        if (!filter) {
            this.buf = new Array(this.cap);
            this.head = 0;
            this.len = 0;
            return len;
        }

        const kept = this.tail(this.len, undefined).filter((l) => !matchFilter(l, filter));
        this.buf = new Array(this.cap);
        this.head = 0;
        this.len = 0;
        for (const l of kept.slice(-this.cap)) this.append(l);
        return len - this.len;
    }

    size(): number {
        return this.len;
    }
}
