import type { SqliteDatabase } from "@yinuo-ngm/storage";
import type { DashboardDocV1, DashboardRepo } from "../../domain/dashboard";

function createDashboardTable(db: SqliteDatabase) {
    db.exec(`
        CREATE TABLE IF NOT EXISTS dashboard_docs (
            project_id TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );
    `);
}

export class SqliteDashboardRepo implements DashboardRepo {
    constructor(private readonly db: SqliteDatabase) {
        createDashboardTable(db);
    }

    async load(projectId: string): Promise<DashboardDocV1 | null> {
        const row = this.db
            .prepare(`SELECT value FROM dashboard_docs WHERE project_id = ? LIMIT 1`)
            .get(projectId) as { value: string } | undefined;
        if (!row) return null;
        return JSON.parse(row.value) as DashboardDocV1;
    }

    async save(projectId: string, doc: DashboardDocV1): Promise<void> {
        const stmt = this.db.prepare(`
            INSERT INTO dashboard_docs (project_id, value)
            VALUES (?, ?)
            ON CONFLICT(project_id) DO UPDATE SET value = excluded.value
        `);
        stmt.run(projectId, JSON.stringify(doc));
    }
}
