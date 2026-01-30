import * as fs from "fs";
import * as path from "path";
import type { IKvRepo } from "./kv.repo";
import { FileLock } from "./file-lock";

type DbShape<T> = {
    version: 1;
    items: Record<string, T>;
};

function ensureDir(file: string) {
    const dir = path.dirname(file);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function atomicWrite(file: string, content: string) {
    const tmp = `${file}.tmp`;
    fs.writeFileSync(tmp, content, "utf-8");
    fs.renameSync(tmp, file);
}

/**
 * @description JSON 文件实现的 KV 仓库
 *  - 自动创建目录/文件 
 *  - 原子写：写 .tmp 再 rename
 *  - 所有操作通过 FileLock 串行化，避免写丢
 * @author ZhangJing
 * @date 2026-01-15 11:01
 * @export
 * @class JsonFileKvRepo
 * @implements {IKvRepo<T>}
 * @template T
 */
export class JsonFileKvRepo<T> implements IKvRepo<T> {
    private lock = new FileLock();

    constructor(private file: string) {
        this.ensure();
    }

    private ensure() {
        ensureDir(this.file);
        if (!fs.existsSync(this.file)) {
            const init: DbShape<T> = { version: 1, items: {} };
            atomicWrite(this.file, JSON.stringify(init, null, 2));
        }
    }

    private readUnsafe(): DbShape<T> {
        const raw = fs.readFileSync(this.file, "utf-8");
        const db = JSON.parse(raw) as DbShape<T>;

        // 容错：如果文件被手动改坏，至少别崩
        if (!db || db.version !== 1 || typeof db.items !== "object" || !db.items) {
            return { version: 1, items: {} };
        }
        return db;
    }

    private writeUnsafe(db: DbShape<T>) {
        atomicWrite(this.file, JSON.stringify(db, null, 2));
    }

    async get(id: string): Promise<T | null> {
        return this.lock.withLock(this.file, async () => {
            const db = this.readUnsafe();
            return db.items[id] ?? null;
        });
    }

    async list(): Promise<T[]> {
        return this.lock.withLock(this.file, async () => {
            const db = this.readUnsafe();
            return Object.values(db.items);
        });
    }

    async set(id: string, value: T): Promise<void> {
        await this.lock.withLock(this.file, async () => {
            const db = this.readUnsafe();
            db.items[id] = value;
            this.writeUnsafe(db);
        });
    }

    async delete(id: string): Promise<void> {
        await this.lock.withLock(this.file, async () => {
            const db = this.readUnsafe();
            if (id in db.items) delete db.items[id];
            this.writeUnsafe(db);
        });
    }
}
