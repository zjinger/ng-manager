import * as fs from "node:fs";
import * as path from "node:path";
import type { DashboardDocV1 } from "../../domain/dashboard";

export interface DashboardMigrationTarget {
    load(projectId: string): Promise<DashboardDocV1 | null>;
    save(projectId: string, doc: DashboardDocV1): Promise<void>;
}

export interface MigrateDashboardJsonFilesOptions {
    rootDir: string;
    target: DashboardMigrationTarget;
    backup?: boolean;
}

function backupFilePath(sourceFile: string) {
    const dir = path.dirname(sourceFile);
    const ext = path.extname(sourceFile);
    const base = path.basename(sourceFile, ext);
    return path.join(dir, `${base}.legacy.${Date.now()}${ext || ".json"}`);
}

export async function migrateDashboardJsonFilesIfNeeded(
    opts: MigrateDashboardJsonFilesOptions
): Promise<{ count: number }> {
    const dashboardDir = path.join(opts.rootDir, "dashboard");
    if (!fs.existsSync(dashboardDir)) return { count: 0 };

    const files = fs
        .readdirSync(dashboardDir, { withFileTypes: true })
        .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
        .map((entry) => entry.name);

    let count = 0;
    for (const fileName of files) {
        const projectId = path.basename(fileName, ".json");
        const existing = await opts.target.load(projectId);
        if (existing) continue;

        const sourceFile = path.join(dashboardDir, fileName);
        try {
            const raw = fs.readFileSync(sourceFile, "utf-8");
            const doc = JSON.parse(raw) as DashboardDocV1;
            await opts.target.save(projectId, doc);
            count++;
            if (opts.backup ?? true) {
                try {
                    fs.renameSync(sourceFile, backupFilePath(sourceFile));
                } catch { }
            }
        } catch {
            // ignore broken file
        }
    }

    return { count };
}
