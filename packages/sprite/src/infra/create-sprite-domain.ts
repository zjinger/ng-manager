import type { SystemLogService } from "@yinuo-ngm/logger";
import type { ProjectService } from "@yinuo-ngm/project";
import type { SqliteDatabase } from "@yinuo-ngm/storage";
import { SpriteServiceImpl } from "../domain/sprite.service.impl";
import { SqliteSpriteRepo } from "./sqlite-sprite.repo";
import type { SpriteService } from "../domain/sprite.service";

export function createSpriteDomain(opts: {
    dataDir: string;
    cacheDir: string;
    db: SqliteDatabase;
    project: ProjectService;
    sysLog: SystemLogService;
}): SpriteService {
    const spriteRepo = new SqliteSpriteRepo(
        opts.db,
        opts.dataDir
    );
    return new SpriteServiceImpl(
        spriteRepo,
        opts.project,
        opts.sysLog,
        opts.cacheDir,
        opts.dataDir
    );
}
