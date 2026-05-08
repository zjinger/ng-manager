import type { ApiHistoryEntity } from "../../../domain/models";
import type { HistoryRepo } from "../../../domain/services";
import type { ApiScope } from "../../../domain/models/types";
import type { SqliteDatabase } from "@yinuo-ngm/storage";

function scopeKey(scope: ApiScope, projectId?: string) {
    return scope === "project" ? String(projectId ?? "").trim() : "";
}

function createHistoryTable(db: SqliteDatabase) {
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

function truncateBody(h: ApiHistoryEntity, bodyMaxChars = 200_000): ApiHistoryEntity {
    const body = h.response?.bodyText;
    if (!body) return h;
    const text = String(body);
    if (text.length <= bodyMaxChars) return h;

    return {
        ...h,
        response: {
            status: h.response?.status!,
            statusText: h.response?.statusText,
            headers: h.response?.headers ?? {},
            bodyText: text.slice(0, bodyMaxChars) + "\n/* truncated */",
            bodySize: h.response?.bodySize ?? text.length,
        },
    };
}

export class SqliteHistoryRepo implements HistoryRepo {
    constructor(
        private readonly db: SqliteDatabase,
        private readonly bodyMaxChars = 200_000
    ) {
        createHistoryTable(db);
    }

    async add(h: ApiHistoryEntity, scope: ApiScope, projectId?: string): Promise<void> {
        const safe = truncateBody(h, this.bodyMaxChars);
        const stmt = this.db.prepare(`
            INSERT INTO api_history (id, scope, project_id, created_at, value)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                scope = excluded.scope,
                project_id = excluded.project_id,
                created_at = excluded.created_at,
                value = excluded.value
        `);
        stmt.run(
            safe.id,
            scope,
            scopeKey(scope, projectId),
            safe.createdAt ?? Date.now(),
            JSON.stringify(safe)
        );
    }

    async list(query: { scope: ApiScope; projectId?: string; limit: number; offset: number }): Promise<ApiHistoryEntity[]> {
        const rows = this.db
            .prepare(`
                SELECT value FROM api_history
                WHERE scope = ? AND project_id = ?
                ORDER BY created_at DESC, rowid DESC
                LIMIT ? OFFSET ?
            `)
            .all(query.scope, scopeKey(query.scope, query.projectId), Math.max(0, query.limit), Math.max(0, query.offset)) as Array<{ value: string }>;
        return rows.map((row) => JSON.parse(row.value) as ApiHistoryEntity);
    }

    async purge(query: { scope: ApiScope; projectId?: string; olderThan?: number; maxCount?: number }): Promise<number> {
        const projectId = scopeKey(query.scope, query.projectId);
        const allRows = this.db
            .prepare(`
                SELECT id, created_at FROM api_history
                WHERE scope = ? AND project_id = ?
                ORDER BY created_at DESC, rowid DESC
            `)
            .all(query.scope, projectId) as Array<{ id: string; created_at: number }>;

        let keptIds = allRows.map((row) => row.id);

        if (typeof query.olderThan === "number") {
            keptIds = keptIds.filter((_, idx) => (allRows[idx]?.created_at ?? 0) >= query.olderThan!);
        }

        if (typeof query.maxCount === "number") {
            keptIds = keptIds.slice(0, Math.max(0, query.maxCount));
        }

        const kept = new Set(keptIds);
        const removed = allRows.filter((row) => !kept.has(row.id));
        if (removed.length === 0) return 0;

        const del = this.db.prepare(`DELETE FROM api_history WHERE id = ?`);
        const tx = this.db.transaction(() => {
            for (const row of removed) {
                del.run(row.id);
            }
        });
        tx();

        return removed.length;
    }
}
