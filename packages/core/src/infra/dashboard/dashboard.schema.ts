import type { SqliteDatabase } from "@yinuo-ngm/storage";

export function initDashboardSchema(db: SqliteDatabase): void {
    db.exec(`
        CREATE TABLE IF NOT EXISTS dashboard_docs (
            project_id TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );
    `);
}
