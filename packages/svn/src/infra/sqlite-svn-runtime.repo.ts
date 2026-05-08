import fs from "node:fs";
import path from "node:path";
import type { SqliteDatabase } from "@yinuo-ngm/storage";
import type { SvnRuntime } from "../svn.types";
import type { SvnRuntimeRepo } from "../svn-runtime.repo";

function createRuntimeTable(db: SqliteDatabase) {
    db.exec(`
        CREATE TABLE IF NOT EXISTS svn_runtime (
            project_id TEXT NOT NULL,
            source_id TEXT NOT NULL,
            value TEXT NOT NULL,
            PRIMARY KEY (project_id, source_id)
        );
    `);
}

function backupFilePath(sourceFile: string) {
    const dir = path.dirname(sourceFile);
    const ext = path.extname(sourceFile);
    const base = path.basename(sourceFile, ext);
    return path.join(dir, `${base}.legacy.${Date.now()}${ext || ".json"}`);
}

export function migrateLegacySvnRuntimeIfNeeded(db: SqliteDatabase, runtimeFile: string): number {
    createRuntimeTable(db);

    const hasRows = db.prepare(`SELECT 1 FROM svn_runtime LIMIT 1`).get() != null;
    if (hasRows || !fs.existsSync(runtimeFile)) return 0;

    let raw = "";
    try {
        raw = fs.readFileSync(runtimeFile, "utf-8");
    } catch {
        return 0;
    }

    let parsed: Record<string, SvnRuntime>;
    try {
        parsed = JSON.parse(raw);
    } catch {
        return 0;
    }

    const stmt = db.prepare(`
        INSERT INTO svn_runtime (project_id, source_id, value)
        VALUES (?, ?, ?)
        ON CONFLICT(project_id, source_id) DO UPDATE SET value = excluded.value
    `);
    let count = 0;
    const tx = db.transaction(() => {
        for (const [key, value] of Object.entries(parsed ?? {})) {
            const idx = key.indexOf(":");
            if (idx <= 0) continue;
            const projectId = key.slice(0, idx).trim();
            const sourceId = key.slice(idx + 1).trim();
            if (!projectId || !sourceId) continue;
            stmt.run(projectId, sourceId, JSON.stringify(value));
            count++;
        }
    });
    tx();

    if (parsed) {
        try {
            fs.renameSync(runtimeFile, backupFilePath(runtimeFile));
        } catch { }
    }

    return count;
}

export class SqliteSvnRuntimeRepo implements SvnRuntimeRepo {
    constructor(
        private readonly db: SqliteDatabase,
        runtimeFile?: string
    ) {
        createRuntimeTable(db);
        if (runtimeFile) {
            migrateLegacySvnRuntimeIfNeeded(db, runtimeFile);
        }
    }

    get(projectId: string, sourceId: string): SvnRuntime | undefined {
        const row = this.db
            .prepare(`SELECT value FROM svn_runtime WHERE project_id = ? AND source_id = ? LIMIT 1`)
            .get(projectId, sourceId) as { value: string } | undefined;
        if (!row) return undefined;
        return JSON.parse(row.value) as SvnRuntime;
    }

    update(projectId: string, sourceId: string, patch: Partial<SvnRuntime>) {
        const prev = this.get(projectId, sourceId) ?? { projectId, sourceId };
        const next = { ...prev, ...patch };
        const stmt = this.db.prepare(`
            INSERT INTO svn_runtime (project_id, source_id, value)
            VALUES (?, ?, ?)
            ON CONFLICT(project_id, source_id) DO UPDATE SET value = excluded.value
        `);
        stmt.run(projectId, sourceId, JSON.stringify(next));
        return next;
    }
}
