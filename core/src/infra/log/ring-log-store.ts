
import type { ILogStore, LogTailFilter } from "./log.store";
import type { LogLine } from "./types";

function matchFilter(line: LogLine, filter?: LogTailFilter) {
    if (!filter) return true;
    if (filter.refId !== undefined && line.refId !== filter.refId) return false;
    if (filter.source !== undefined && line.source !== filter.source) return false;
    if (filter.level !== undefined && line.level !== filter.level) return false;
    return true;
}

/**
 * Ring Buffer 日志存储：固定容量，性能稳定
 * - append O(1)
 * - tail O(n)（n <= capacity）
 */
export class RingLogStore implements ILogStore {
    private buf: Array<LogLine | undefined>;
    private cap: number;

    private head = 0; // 下一次写入位置
    private len = 0;  // 当前有效长度

    constructor(capacity = 2000) {
        if (!Number.isFinite(capacity) || capacity <= 0) {
            throw new Error("RingLogStore capacity must be > 0");
        }
        this.cap = Math.floor(capacity);
        this.buf = new Array(this.cap);
    }

    append(line: LogLine): void {
        this.buf[this.head] = line;
        this.head = (this.head + 1) % this.cap;
        if (this.len < this.cap) this.len++;
    }

    tail(limit: number, filter?: LogTailFilter): LogLine[] {
        const lim = Math.max(0, Math.floor(limit));
        if (lim === 0 || this.len === 0) return [];

        // 从最旧开始遍历到最新
        const out: LogLine[] = [];
        const start = (this.head - this.len + this.cap) % this.cap;

        for (let i = 0; i < this.len; i++) {
            const idx = (start + i) % this.cap;
            const line = this.buf[idx];
            if (!line) continue;
            if (!matchFilter(line, filter)) continue;
            out.push(line);
        }

        // 只取最后 lim 条
        if (out.length <= lim) return out;
        return out.slice(out.length - lim);
    }

    tailById(refId: string, n: number): LogLine[] {
        return this.tail(n, { refId });
    }

    clear(filter?: LogTailFilter): void {
        if (!filter) {
            this.buf = new Array(this.cap);
            this.head = 0;
            this.len = 0;
            return;
        }

        // 有过滤条件：保留不匹配的，重新构建 ring
        const kept = this.tail(this.len, undefined).filter((l) => !matchFilter(l, filter));
        this.buf = new Array(this.cap);
        this.head = 0;
        this.len = 0;
        for (const l of kept.slice(-this.cap)) this.append(l);
    }

    size(): number {
        return this.len;
    }
}
