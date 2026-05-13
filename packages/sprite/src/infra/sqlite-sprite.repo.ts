import fs from "node:fs";
import path from "node:path";
import type { SqliteDatabase } from "@yinuo-ngm/storage";
import { CoreError, CoreErrorCodes } from "@yinuo-ngm/errors";
import type { SpriteConfig, SpriteRepo } from "../domain/sprite.repo";

function normalizeSpriteConfig(projectId: string, cfg: Omit<SpriteConfig, "projectId" | "updatedAt"> | SpriteConfig): SpriteConfig {
    return {
        projectId,
        updatedAt: Date.now(),
        localDir: cfg.localDir,
        enabled: cfg.enabled,
        sourceId: cfg.sourceId,
        template: cfg.template.trim() || '<i class="{base} {class}"></i>',
        spriteUrl: cfg.spriteUrl.trim() || '/assets/icons/{group}.png',
        spriteExportDir: cfg.spriteExportDir?.trim() || '',
        lessExportDir: cfg.lessExportDir?.trim() || '',
        prefix: (cfg.prefix || "sl").trim() || "sl",
        algorithm: cfg.algorithm || "binary-tree",
        persistLess: cfg.persistLess ?? true,
        localImageRoot: cfg.localImageRoot?.trim() || undefined,
        localCacheDir: cfg.localCacheDir?.trim() || undefined,
    };
}

function backupFilePath(sourceFile: string) {
    const dir = path.dirname(sourceFile);
    const ext = path.extname(sourceFile);
    const base = path.basename(sourceFile, ext);
    return path.join(dir, `${base}.legacy.${Date.now()}${ext || ".json"}`);
}

export function migrateLegacySpriteConfigsIfNeeded(db: SqliteDatabase, dataDir: string): number {
    const hasRows = db.prepare(`SELECT 1 FROM sprite_configs LIMIT 1`).get() != null;
    if (hasRows) return 0;

    const legacyDir = path.join(dataDir, "sprite", "configs");
    if (!fs.existsSync(legacyDir)) return 0;

    const files = fs.readdirSync(legacyDir, { withFileTypes: true })
        .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
        .map((entry) => entry.name);

    const stmt = db.prepare(`
        INSERT INTO sprite_configs (project_id, value)
        VALUES (?, ?)
        ON CONFLICT(project_id) DO UPDATE SET value = excluded.value
    `);

    let count = 0;
    const importedFiles: string[] = [];
    const tx = db.transaction(() => {
        for (const fileName of files) {
            const sourceFile = path.join(legacyDir, fileName);
            let raw = "";
            try {
                raw = fs.readFileSync(sourceFile, "utf-8");
            } catch {
                continue;
            }

            let parsed: SpriteConfig;
            try {
                parsed = JSON.parse(raw) as SpriteConfig;
            } catch {
                continue;
            }

            const projectId = String(parsed.projectId || path.basename(fileName, ".json")).trim();
            if (!projectId) continue;

            stmt.run(projectId, JSON.stringify({
                ...parsed,
                projectId,
            }));
            count++;
            importedFiles.push(sourceFile);
        }
    });
    tx();

    if (count > 0) {
        for (const sourceFile of importedFiles) {
            try {
                fs.renameSync(sourceFile, backupFilePath(sourceFile));
            } catch {
                // ignore
            }
        }
    }

    return count;
}

export class SqliteSpriteRepo implements SpriteRepo {
    constructor(private readonly db: SqliteDatabase) {}

    async getByProjectId(projectId: string): Promise<SpriteConfig | null> {
        try {
            const row = this.db
                .prepare(`SELECT value FROM sprite_configs WHERE project_id = ? LIMIT 1`)
                .get(projectId) as { value: string } | undefined;
            if (!row) return null;
            return JSON.parse(row.value) as SpriteConfig;
        } catch {
            return null;
        }
    }

    async create(projectId: string, cfg: Omit<SpriteConfig, "projectId" | "updatedAt">): Promise<SpriteConfig> {
        const next = normalizeSpriteConfig(projectId, cfg);
        this.db.prepare(`
            INSERT INTO sprite_configs (project_id, value)
            VALUES (?, ?)
            ON CONFLICT(project_id) DO UPDATE SET value = excluded.value
        `).run(projectId, JSON.stringify(next));
        return next;
    }

    async update(projectId: string, patch: Partial<SpriteConfig>): Promise<SpriteConfig> {
        const cur = await this.getByProjectId(projectId);
        if (!cur) throw new CoreError(CoreErrorCodes.SPRITE_CONFIG_NOT_FOUND, `SpriteConfig not found for projectId: ${projectId}`);
        const next = { ...cur, ...patch, projectId, updatedAt: Date.now() };
        this.db.prepare(`
            INSERT INTO sprite_configs (project_id, value)
            VALUES (?, ?)
            ON CONFLICT(project_id) DO UPDATE SET value = excluded.value
        `).run(projectId, JSON.stringify(next));
        return next;
    }

    async remove(projectId: string): Promise<void> {
        this.db.prepare(`DELETE FROM sprite_configs WHERE project_id = ?`).run(projectId);
    }
}
