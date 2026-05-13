import type { SqliteDatabase } from "@yinuo-ngm/storage";

export function initSvnSchema(db: SqliteDatabase): void {
    db.exec(`
        CREATE TABLE IF NOT EXISTS svn_runtime (
            project_id TEXT NOT NULL,
            source_id TEXT NOT NULL,
            value TEXT NOT NULL,
            PRIMARY KEY (project_id, source_id)
        );
    `);
}
