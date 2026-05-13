import type { SqliteDatabase } from "@yinuo-ngm/storage";

export function initApiHistorySchema(db: SqliteDatabase): void {
    db.exec(`
        CREATE TABLE IF NOT EXISTS api_history (
            id TEXT PRIMARY KEY,
            scope TEXT NOT NULL,
            project_id TEXT NOT NULL DEFAULT '',
            created_at INTEGER NOT NULL,
            value TEXT NOT NULL
        );
    `);

    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_api_history_scope_project_created_at
        ON api_history (scope, project_id, created_at DESC);
    `);
}
