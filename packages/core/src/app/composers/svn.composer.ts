import * as path from "path";

import { SvnSyncServiceImpl, SvnTaskManager } from "../../domain/svn";
import type { SystemLogService } from "../../domain/logger";
import type { ProjectService } from "@yinuo-ngm/project";
import type { CoreEventMap } from "../../infra/event/events";
import type { IEventBus } from "@yinuo-ngm/event";
import { JsonSvnRuntimeRepo } from "../../infra/svn";

export function createSvnDomain(opts: {
    dataDir: string;
    events: IEventBus<CoreEventMap>;
    sysLog: SystemLogService;
    project: ProjectService;
}) {
    const svnRepo = new JsonSvnRuntimeRepo(path.join(opts.dataDir, "runtime", "svn.runtime.json"));
    const svnTaskManager = new SvnTaskManager();
    return new SvnSyncServiceImpl(
        svnRepo,
        opts.events,
        opts.sysLog,
        svnTaskManager,
        opts.project
    );
}
