import type Database from "better-sqlite3";
import type { KvRepo } from "../kv";

type StoredRow = {
    id: string;
    value: string;
};

export interface SqliteJsonKvRepoOptions {
    tableName: string;
}

/**
 * SQLite 版本的 JSON KV 仓库。
 * - 使用单表保存 { id, value(JSON) }
 * - 适合替代当前的单文件 KV 仓库
 */
export class SqliteJsonKvRepo<T> implements KvRepo<T> {
    private readonly tableName: string;

    constructor(
        private readonly db: Database.Database,
        opts: SqliteJsonKvRepoOptions
    ) {
        this.tableName = this.normalizeTableName(opts.tableName);
        this.ensureTable();
    }

    async get(id: string): Promise<T | null> {
        const row = this.db
            .prepare(`SELECT value FROM ${this.tableName} WHERE id = ? LIMIT 1`)
            .get(id) as Pick<StoredRow, "value"> | undefined;

        if (!row) return null;
        return JSON.parse(row.value) as T;
    }

    async list(): Promise<T[]> {
        const rows = this.db
            .prepare(`SELECT value FROM ${this.tableName} ORDER BY rowid ASC`)
            .all() as Array<Pick<StoredRow, "value">>;

        return rows.map((row) => JSON.parse(row.value) as T);
    }

    async set(id: string, value: T): Promise<void> {
        const stmt = this.db.prepare(`
            INSERT INTO ${this.tableName} (id, value)
            VALUES (?, ?)
            ON CONFLICT(id) DO UPDATE SET value = excluded.value
        `);
        stmt.run(id, JSON.stringify(value));
    }

    async delete(id: string): Promise<void> {
        this.db.prepare(`DELETE FROM ${this.tableName} WHERE id = ?`).run(id);
    }

    private ensureTable() {
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS ${this.tableName} (
                id TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );
        `);
    }

    private normalizeTableName(name: string): string {
        const trimmed = String(name ?? "").trim();
        if (!trimmed) {
            throw new Error("tableName is required");
        }
        if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(trimmed)) {
            throw new Error(`Invalid SQLite table name: ${trimmed}`);
        }
        return trimmed;
    }
}
