import * as fs from "fs";
import * as path from "path";
import type { Project } from "../project.types";
import type { KvRepo } from "@yinuo-ngm/storage";

type LegacyShape = { projects: Project[] };

function isLegacyShape(x: any): x is LegacyShape {
    return !!x && Array.isArray(x.projects);
}

export async function migrateProjectsIfNeeded(opts: {
    dbDir: string;
    projectKv: KvRepo<Project>;
    legacyFileName?: string;
    backup?: boolean;
}): Promise<{ migrated: boolean; count: number; backupFile?: string }> {
    const legacyFileName = opts.legacyFileName ?? "projects.json";
    const legacyFile = path.join(opts.dbDir, legacyFileName);

    if (!fs.existsSync(legacyFile)) {
        return { migrated: false, count: 0 };
    }

    const existing = await opts.projectKv.list();
    if (existing.length > 0) {
        return { migrated: false, count: 0 };
    }

    let raw = "";
    try {
        raw = fs.readFileSync(legacyFile, "utf-8");
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
        if (opts.backup ?? true) {
            const backupFile = path.join(
                opts.dbDir,
                `projects.legacy.${Date.now()}.json`
            );
            fs.renameSync(legacyFile, backupFile);
            return { migrated: true, count: 0, backupFile };
        }
        return { migrated: true, count: 0 };
    }

    for (const p of list) {
        if (!p?.id) continue;
        await opts.projectKv.set(p.id, p);
    }
    if (opts.backup ?? true) {
        const backupFile = path.join(
            opts.dbDir,
            `projects.legacy.${Date.now()}.json`
        );
        try {
            fs.renameSync(legacyFile, backupFile);
            return { migrated: true, count: list.length, backupFile };
        } catch {
            return { migrated: true, count: list.length };
        }
    }
    return { migrated: true, count: list.length };
}
