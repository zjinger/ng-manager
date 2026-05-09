import * as fs from "fs";
import * as path from "path";
import type { Project } from "../project.types";
import type { KvRepo } from "@yinuo-ngm/storage";

type LegacyShape = { projects: Project[] };

function isLegacyShape(x: any): x is LegacyShape {
    return !!x && Array.isArray(x.projects);
}

function buildBackupFile(sourceFile: string) {
    const dir = path.dirname(sourceFile);
    const ext = path.extname(sourceFile);
    const base = path.basename(sourceFile, ext);
    return path.join(dir, `${base}.legacy.${Date.now()}${ext || ".json"}`);
}

function resolveLegacyProjectsFile(sourceFile: string): { path: string; fromLegacy: boolean } | null {
    if (fs.existsSync(sourceFile)) return { path: sourceFile, fromLegacy: false };

    const dir = path.dirname(sourceFile);
    if (!fs.existsSync(dir)) return null;

    const ext = path.extname(sourceFile);
    const base = path.basename(sourceFile, ext);
    const prefix = `${base}.legacy.`;

    const candidates = fs
        .readdirSync(dir, { withFileTypes: true })
        .filter((entry) => entry.isFile() && entry.name.startsWith(prefix))
        .map((entry) => path.join(dir, entry.name))
        .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);

    if (candidates.length === 0) return null;
    return { path: candidates[0], fromLegacy: true };
}

export async function migrateProjectsIfNeeded(opts: {
    dbDir: string;
    projectKv: KvRepo<Project>;
    legacyFileName?: string;
    backup?: boolean;
}): Promise<{ migrated: boolean; count: number; backupFile?: string }> {
    const legacyFileName = opts.legacyFileName ?? "projects.json";
    const legacyFile = path.join(opts.dbDir, legacyFileName);
    const resolved = resolveLegacyProjectsFile(legacyFile);
    if (!resolved) {
        return { migrated: false, count: 0 };
    }

    const existing = await opts.projectKv.list();
    if (existing.length > 0) {
        return { migrated: false, count: 0 };
    }

    let raw = "";
    try {
        raw = fs.readFileSync(resolved.path, "utf-8");
    } catch {
        return { migrated: false, count: 0 };
    }

    let json: any;
    try {
        json = JSON.parse(raw);
    } catch {
        return { migrated: false, count: 0 };
    }

    if (!isLegacyShape(json)) {
        return { migrated: false, count: 0 };
    }
    const list = json.projects ?? [];
    if (list.length === 0) {
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

    for (const p of list) {
        if (!p?.id) continue;
        await opts.projectKv.set(p.id, p);
    }
    if ((opts.backup ?? true) && !resolved.fromLegacy) {
        const backupFile = buildBackupFile(resolved.path);
        try {
            fs.renameSync(resolved.path, backupFile);
            return { migrated: true, count: list.length, backupFile };
        } catch {
            return { migrated: true, count: list.length };
        }
    }
    return { migrated: true, count: list.length };
}
