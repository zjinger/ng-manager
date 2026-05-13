import type { SqliteDatabase } from "@yinuo-ngm/storage";

const API_SCOPED_JSON_TABLES = [
    "api_requests",
    "api_envs",
    "api_collections",
] as const;

function initScopedJsonTable(db: SqliteDatabase, tableName: string): void {
    db.exec(`
        CREATE TABLE IF NOT EXISTS ${tableName} (
            scope TEXT NOT NULL,
            project_id TEXT NOT NULL DEFAULT '',
            id TEXT NOT NULL,
            value TEXT NOT NULL,
            PRIMARY KEY (scope, project_id, id)
        );
    `);
}

export function initApiScopedJsonSchema(db: SqliteDatabase): void {
    for (const tableName of API_SCOPED_JSON_TABLES) {
        initScopedJsonTable(db, tableName);
    }
}
