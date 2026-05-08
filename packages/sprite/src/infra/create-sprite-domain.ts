import path from "node:path";
import type { SystemLogService } from "@yinuo-ngm/logger";
import type { ProjectService } from "@yinuo-ngm/project";
import { createSqliteDatabase } from "@yinuo-ngm/storage";
import { SpriteServiceImpl } from "../domain/sprite.service.impl";
import { SqliteSpriteRepo } from "./sqlite-sprite.repo";
import type { SpriteService } from "../domain/sprite.service";

export function createSpriteDomain(opts: {
    dataDir: string;
    cacheDir: string;
    project: ProjectService;
    sysLog: SystemLogService;
}): SpriteService {
    const spriteRepo = new SqliteSpriteRepo(
        createSqliteDatabase(path.join(opts.dataDir, "sprite.db")),
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
