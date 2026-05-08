import * as fs from "node:fs";
import * as path from "node:path";
import * as readline from "node:readline";
import type { ApiHistoryEntity } from "../../../domain/models";
import type { ApiScope } from "../../../domain/models/types";
import type { DbShape } from "@yinuo-ngm/storage";
import { readJsonOrNull } from "@yinuo-ngm/storage";

export interface ScopedKvRepo<T> {
    list(scope: ApiScope, projectId?: string): Promise<T[]>;
    save(value: T, scope: ApiScope, projectId?: string): Promise<void>;
}

export interface ScopedHistoryRepo {
    list(query: { scope: ApiScope; projectId?: string; limit: number; offset: number }): Promise<ApiHistoryEntity[]>;
    add(h: ApiHistoryEntity, scope: ApiScope, projectId?: string): Promise<void>;
}

export interface MigrateScopedJsonKvFilesOptions<T> {
    rootDir: string;
    fileName: string;
    target: ScopedKvRepo<T>;
    backup?: boolean;
}

export interface MigrateHistoryJsonlFilesOptions {
    rootDir: string;
    fileName: string;
    target: ScopedHistoryRepo;
    backup?: boolean;
}

function backupFilePath(sourceFile: string) {
    const dir = path.dirname(sourceFile);
    const ext = path.extname(sourceFile);
    const base = path.basename(sourceFile, ext);
    return path.join(dir, `${base}.legacy.${Date.now()}${ext || ".json"}`);
}

async function migrateScopedFileIfNeeded<T>(
    sourceFile: string,
    scope: ApiScope,
    projectId: string | undefined,
    target: ScopedKvRepo<T>,
    backup: boolean
) {
    if (!fs.existsSync(sourceFile)) return 0;

    const existing = await target.list(scope, projectId);
    if (existing.length > 0) return 0;

    const db = readJsonOrNull<DbShape<T>>(sourceFile);
    if (!db || db.version !== 1 || !db.items || typeof db.items !== "object") return 0;

    const entries = Object.entries(db.items);
    for (const [, value] of entries) {
        await target.save(value, scope, projectId);
    }

    if (backup) {
        try {
            fs.renameSync(sourceFile, backupFilePath(sourceFile));
        } catch { }
    }

    return entries.length;
}

function listProjectDirs(rootDir: string) {
    const projectsDir = path.join(rootDir, "projects");
    if (!fs.existsSync(projectsDir)) return [];
    return fs.readdirSync(projectsDir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name);
}

export async function migrateScopedJsonKvFilesIfNeeded<T>(
    opts: MigrateScopedJsonKvFilesOptions<T>
): Promise<{ count: number }> {
    let count = 0;
    count += await migrateScopedFileIfNeeded(path.join(opts.rootDir, "global", opts.fileName), "global", undefined, opts.target, opts.backup ?? true);
    for (const projectId of listProjectDirs(opts.rootDir)) {
        count += await migrateScopedFileIfNeeded(
            path.join(opts.rootDir, "projects", projectId, opts.fileName),
            "project",
            projectId,
            opts.target,
            opts.backup ?? true
        );
    }
    return { count };
}

async function migrateHistoryFileIfNeeded(
    sourceFile: string,
    scope: ApiScope,
    projectId: string | undefined,
    target: ScopedHistoryRepo,
    backup: boolean
) {
    if (!fs.existsSync(sourceFile)) return 0;

    const existing = await target.list({ scope, projectId, limit: 1, offset: 0 });
    if (existing.length > 0) return 0;

    const input = fs.createReadStream(sourceFile, { encoding: "utf8" });
    const rl = readline.createInterface({ input, crlfDelay: Infinity });
    let count = 0;
    for await (const line of rl) {
        const s = line.trim();
        if (!s) continue;
        try {
            const entry = JSON.parse(s) as ApiHistoryEntity;
            await target.add(entry, scope, projectId);
            count++;
        } catch {
            // ignore broken line
        }
    }

    if (backup) {
        try {
            fs.renameSync(sourceFile, backupFilePath(sourceFile));
        } catch { }
    }

    return count;
}

export async function migrateJsonlHistoryFilesIfNeeded(
    opts: MigrateHistoryJsonlFilesOptions
): Promise<{ count: number }> {
    let count = 0;
    count += await migrateHistoryFileIfNeeded(path.join(opts.rootDir, "global", "history", opts.fileName), "global", undefined, opts.target, opts.backup ?? true);
    for (const projectId of listProjectDirs(opts.rootDir)) {
        count += await migrateHistoryFileIfNeeded(
            path.join(opts.rootDir, "projects", projectId, "history", opts.fileName),
            "project",
            projectId,
            opts.target,
            opts.backup ?? true
        );
    }
    return { count };
}
