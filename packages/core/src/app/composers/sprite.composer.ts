import { SpriteServiceImpl } from "../../domain/sprite";
import type { SystemLogService } from "../../domain/logger";
import type { ProjectService } from "@yinuo-ngm/project";
import { JsonSpriteRepo } from "../../infra/sprite";

export function createSpriteDomain(opts: {
    dataDir: string;
    cacheDir: string;
    project: ProjectService;
    sysLog: SystemLogService;
}) {
    const spriteRepo = new JsonSpriteRepo(opts.dataDir);
    return new SpriteServiceImpl(
        spriteRepo,
        opts.project,
        opts.sysLog,
        opts.cacheDir,
        opts.dataDir
    );
}
