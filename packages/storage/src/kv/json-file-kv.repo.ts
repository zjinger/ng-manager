import * as fs from "fs";
import { FileLock } from "../lock";
import { KvRepo } from "./kv.repo";

import { atomicWrite, ensureDir, readJsonOrDefault } from "../fs";
import { DbShape } from "../types";


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
export class JsonFileKvRepo<T> implements KvRepo<T> {
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
        const db = readJsonOrDefault<DbShape<T>>(this.file, { version: 1, items: {} });
        if (db.version !== 1 || typeof db.items !== "object" || !db.items) {
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
