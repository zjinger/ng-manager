import type { SystemLogService } from "@yinuo-ngm/logger";
import type { ProjectService } from "@yinuo-ngm/project";
import type { SqliteDatabase } from "@yinuo-ngm/storage";
import { SpriteServiceImpl } from "../domain/sprite.service.impl";
import {
    migrateLegacySpriteConfigsIfNeeded,
    SqliteSpriteRepo,
} from "./sqlite-sprite.repo";
import type { SpriteService } from "../domain/sprite.service";
import { initSpriteSchema } from "./sprite.schema";

export function createSpriteDomain(opts: {
    dataDir: string;
    cacheDir: string;
    db: SqliteDatabase;
    project: ProjectService;
    sysLog: SystemLogService;
    migrateIfNeeded?: boolean;
}): SpriteService {
    initSpriteSchema(opts.db);
    if (opts.migrateIfNeeded ?? true) {
        migrateLegacySpriteConfigsIfNeeded(opts.db, opts.dataDir);
    }
    const spriteRepo = new SqliteSpriteRepo(opts.db);
    return new SpriteServiceImpl(
        spriteRepo,
        opts.project,
        opts.sysLog,
        opts.cacheDir,
        opts.dataDir
    );
}
