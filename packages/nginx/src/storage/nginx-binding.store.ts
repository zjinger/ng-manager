import fs from 'node:fs';
import { mkdir, readFile, rm, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import type { SqliteDatabase } from '@yinuo-ngm/storage';

export interface NginxBindingStore {
    load(): Promise<string | null>;
    save(path: string): Promise<void>;
    clear(): Promise<void>;
}

interface PersistedNginxBinding {
    path: string;
    updatedAt: string;
}

function backupFilePath(sourceFile: string) {
    const extIndex = sourceFile.lastIndexOf('.');
    const ext = extIndex >= 0 ? sourceFile.slice(extIndex) : '.json';
    const base = extIndex >= 0 ? sourceFile.slice(0, extIndex) : sourceFile;
    return `${base}.legacy.${Date.now()}${ext}`;
}

function createSqliteBindingTable(db: SqliteDatabase) {
    db.exec(`
        CREATE TABLE IF NOT EXISTS nginx_binding_state (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            path TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
    `);
}

export function migrateNginxBindingJsonIfNeeded(db: SqliteDatabase, dataDir: string): number {
    createSqliteBindingTable(db);
    const hasRow = db.prepare(`SELECT 1 FROM nginx_binding_state WHERE id = 1 LIMIT 1`).get() != null;
    if (hasRow) return 0;

    const bindingPath = join(dataDir, 'nginx', 'binding.json');
    if (!fs.existsSync(bindingPath)) return 0;

    let raw = '';
    try {
        raw = fs.readFileSync(bindingPath, 'utf-8');
    } catch {
        return 0;
    }

    let parsed: Partial<PersistedNginxBinding>;
    try {
        parsed = JSON.parse(raw) as Partial<PersistedNginxBinding>;
    } catch {
        return 0;
    }

    const normalizedPath = String(parsed.path ?? '').trim();
    if (!normalizedPath) return 0;

    const updatedAt = parsed.updatedAt ? String(parsed.updatedAt) : new Date().toISOString();
    db.prepare(`
        INSERT INTO nginx_binding_state (id, path, updated_at)
        VALUES (1, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            path = excluded.path,
            updated_at = excluded.updated_at
    `).run(normalizedPath, updatedAt);

    try {
        fs.renameSync(bindingPath, backupFilePath(bindingPath));
    } catch {
        // ignore
    }

    return 1;
}

export function createNginxBindingStore(dataDir: string): NginxBindingStore {
    const bindingPath = join(dataDir, 'nginx', 'binding.json');

    return {
        async load(): Promise<string | null> {
            try {
                const raw = await readFile(bindingPath, 'utf-8');
                const parsed = JSON.parse(raw) as Partial<PersistedNginxBinding>;
                const path = parsed.path?.trim();
                return path || null;
            } catch {
                return null;
            }
        },

        async save(path: string): Promise<void> {
            const normalizedPath = path.trim();
            if (!normalizedPath) {
                return;
            }
            await mkdir(dirname(bindingPath), { recursive: true });
            const payload: PersistedNginxBinding = {
                path: normalizedPath,
                updatedAt: new Date().toISOString(),
            };
            await writeFile(bindingPath, JSON.stringify(payload, null, 2), 'utf-8');
        },

        async clear(): Promise<void> {
            await rm(bindingPath, { force: true });
        },
    };
}

export function createSqliteNginxBindingStore(db: SqliteDatabase, dataDir?: string): NginxBindingStore {
    createSqliteBindingTable(db);
    if (dataDir) {
        migrateNginxBindingJsonIfNeeded(db, dataDir);
    }

    return {
        async load(): Promise<string | null> {
            const row = db
                .prepare(`SELECT path FROM nginx_binding_state WHERE id = 1 LIMIT 1`)
                .get() as { path: string } | undefined;
            const value = String(row?.path ?? '').trim();
            return value || null;
        },

        async save(path: string): Promise<void> {
            const normalizedPath = path.trim();
            if (!normalizedPath) return;
            db.prepare(`
                INSERT INTO nginx_binding_state (id, path, updated_at)
                VALUES (1, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    path = excluded.path,
                    updated_at = excluded.updated_at
            `).run(normalizedPath, new Date().toISOString());
        },

        async clear(): Promise<void> {
            db.prepare(`DELETE FROM nginx_binding_state WHERE id = 1`).run();
        },
    };
}
