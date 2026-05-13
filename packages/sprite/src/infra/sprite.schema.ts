import type { SqliteDatabase } from "@yinuo-ngm/storage";

export function initSpriteSchema(db: SqliteDatabase): void {
    db.exec(`
        CREATE TABLE IF NOT EXISTS sprite_configs (
            project_id TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );
    `);
}
