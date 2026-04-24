import { SpriteConfig, SpriteRepo } from "../../domain/sprite";
import { CoreError, CoreErrorCodes } from "../../common/errors";
import * as fs from "fs";
import * as path from "path";

export class JsonSpriteRepo implements SpriteRepo {
    constructor(private dataDir: string) { }

    private filePath(projectId: string) {
        return path.join(this.dataDir, "sprite", 'configs', `${projectId}.json`);
    }

    async getByProjectId(projectId: string): Promise<SpriteConfig | null> {
        const file = this.filePath(projectId);
        try {
            const raw = fs.readFileSync(file, "utf-8");
            return JSON.parse(raw) as SpriteConfig;
        } catch {
            return null;
        }
    }

    async create(projectId: string, cfg: Omit<SpriteConfig, "projectId" | "updatedAt">): Promise<SpriteConfig> {
        const next: SpriteConfig = {
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
        };
        const file = this.filePath(projectId);
        fs.mkdirSync(path.dirname(file), { recursive: true });
        const tmp = `${file}.tmp`;
        fs.writeFileSync(tmp, JSON.stringify(next, null, 2), "utf-8");
        fs.renameSync(tmp, file);
        return next;
    }

    async update(projectId: string, patch: Partial<SpriteConfig>): Promise<SpriteConfig> {
        const cur = await this.getByProjectId(projectId);
        if (!cur) throw new CoreError(CoreErrorCodes.SPRITE_CONFIG_NOT_FOUND, `SpriteConfig not found for projectId: ${projectId}`);
        const next = { ...cur, ...patch, projectId, updatedAt: Date.now() };
        const file = this.filePath(projectId);
        fs.mkdirSync(path.dirname(file), { recursive: true });
        const tmp = `${file}.tmp`;
        fs.writeFileSync(tmp, JSON.stringify(next, null, 2), "utf-8");
        fs.renameSync(tmp, file);
        return next;
    }

    async remove(projectId: string): Promise<void> {
        const file = this.filePath(projectId);
        if (fs.existsSync(file)) {
            fs.unlinkSync(file);
        }
    }
}