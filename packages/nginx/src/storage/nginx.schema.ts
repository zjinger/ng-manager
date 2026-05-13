import type { SqliteDatabase } from "@yinuo-ngm/storage";

export function initNginxSchema(db: SqliteDatabase): void {
    db.exec(`
        CREATE TABLE IF NOT EXISTS nginx_binding_state (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            path TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
    `);
}
