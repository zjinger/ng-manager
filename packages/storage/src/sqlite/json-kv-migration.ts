import fs from "node:fs";
import path from "node:path";
import type { KvRepo } from "../kv";
import { readJsonOrNull } from "../fs";
import type { DbShape } from "../types";

export interface MigrateJsonKvFileIfNeededOptions<T> {
    sourceFile: string;
    target: KvRepo<T>;
    backup?: boolean;
}

export interface MigrateJsonKvFileIfNeededResult {
    migrated: boolean;
    count: number;
    backupFile?: string;
}

interface ResolvedSourceFile {
    path: string;
    fromLegacy: boolean;
}

function buildBackupFile(sourceFile: string) {
    const dir = path.dirname(sourceFile);
    const ext = path.extname(sourceFile);
    const base = path.basename(sourceFile, ext);
    return path.join(dir, `${base}.legacy.${Date.now()}${ext || ".json"}`);
}

function resolveSourceFile(sourceFile: string): ResolvedSourceFile | null {
    if (fs.existsSync(sourceFile)) {
        return { path: sourceFile, fromLegacy: false };
    }

    const dir = path.dirname(sourceFile);
    if (!fs.existsSync(dir)) return null;

    const ext = path.extname(sourceFile);
    const base = path.basename(sourceFile, ext);
    const prefix = `${base}.legacy.`;

    const candidates = fs
        .readdirSync(dir, { withFileTypes: true })
        .filter((entry) => entry.isFile() && entry.name.startsWith(prefix))
        .map((entry) => path.join(dir, entry.name))
        .sort((a, b) => {
            const am = fs.statSync(a).mtimeMs;
            const bm = fs.statSync(b).mtimeMs;
            return bm - am;
        });

    if (candidates.length === 0) return null;
    return { path: candidates[0], fromLegacy: true };
}

/**
 * 将单文件 JSON KV（{ version: 1, items: {...} }）迁移到任意 KvRepo。
 * 适合在切 SQLite 时把旧 JSON 文件一次性导入。
 */
export async function migrateJsonKvFileIfNeeded<T>(
    opts: MigrateJsonKvFileIfNeededOptions<T>
): Promise<MigrateJsonKvFileIfNeededResult> {
    const resolved = resolveSourceFile(opts.sourceFile);
    if (!resolved) {
        return { migrated: false, count: 0 };
    }

    const existing = await opts.target.list();
    if (existing.length > 0) {
        return { migrated: false, count: 0 };
    }

    const db = readJsonOrNull<DbShape<T>>(resolved.path);
    if (!db || db.version !== 1 || !db.items || typeof db.items !== "object") {
        return { migrated: false, count: 0 };
    }

    const entries = Object.entries(db.items);
    if (entries.length === 0) {
        if ((opts.backup ?? true) && !resolved.fromLegacy) {
            const backupFile = buildBackupFile(resolved.path);
            try {
                fs.renameSync(resolved.path, backupFile);
                return { migrated: true, count: 0, backupFile };
            } catch {
                return { migrated: true, count: 0 };
            }
        }
        return { migrated: true, count: 0 };
    }

    for (const [id, value] of entries) {
        await opts.target.set(id, value);
    }

    if ((opts.backup ?? true) && !resolved.fromLegacy) {
        const backupFile = buildBackupFile(resolved.path);
        try {
            fs.renameSync(resolved.path, backupFile);
            return { migrated: true, count: entries.length, backupFile };
        } catch {
            return { migrated: true, count: entries.length };
        }
    }

    return { migrated: true, count: entries.length };
}
