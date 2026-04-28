import type { SystemLogService } from "@yinuo-ngm/logger";
import type { ProjectService } from "@yinuo-ngm/project";
import { SpriteServiceImpl } from "../domain/sprite.service.impl";
import { JsonSpriteRepo } from "./json-sprite.repo";
import type { SpriteService } from "../domain/sprite.service";

export function createSpriteDomain(opts: {
    dataDir: string;
    cacheDir: string;
    project: ProjectService;
    sysLog: SystemLogService;
}): SpriteService {
    const spriteRepo = new JsonSpriteRepo(opts.dataDir);
    return new SpriteServiceImpl(
        spriteRepo,
        opts.project,
        opts.sysLog,
        opts.cacheDir,
        opts.dataDir
    );
}
