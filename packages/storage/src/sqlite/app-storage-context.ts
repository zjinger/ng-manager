import path from "node:path";
import type { SqliteDatabase } from "./sqlite";
import { createSqliteDatabase } from "./sqlite";

export interface AppStorageContextOptions {
    dataDir: string;
    dbName?: string;
}

export interface AppStorageContext {
    db: SqliteDatabase;
    dbPath: string;
    close(): void;
}

export function createAppStorageContext(
    opts: AppStorageContextOptions
): AppStorageContext {
    const dbPath = path.join(opts.dataDir, opts.dbName ?? "ng-manager.db");
    const db = createSqliteDatabase(dbPath);
    return {
        db,
        dbPath,
        close() {
            db.close();
        },
    };
}
