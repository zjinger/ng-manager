import path from "node:path";
import type { SystemLogService } from "@yinuo-ngm/logger";
import type { ProjectService } from "@yinuo-ngm/project";
import { SvnSyncServiceImpl } from "../svn-sync.service.impl";
import { SvnTaskManager } from "../svn-task.manager";
import { JsonSvnRuntimeRepo } from "./json-svn-runtime.repo";
import type { SvnSyncService } from "../svn-sync.service";
import type { IEventBus } from "@yinuo-ngm/event";
import type { SvnEventMap } from "../svn.events";

export function createSvnDomain(opts: {
    dataDir: string;
    events: IEventBus<SvnEventMap>;
    sysLog: SystemLogService;
    project: ProjectService;
}): SvnSyncService {
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
