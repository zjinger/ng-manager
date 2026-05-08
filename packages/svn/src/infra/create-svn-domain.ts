import type { SystemLogService } from "@yinuo-ngm/logger";
import type { ProjectService } from "@yinuo-ngm/project";
import { SvnSyncServiceImpl } from "../svn-sync.service.impl";
import { SvnTaskManager } from "../svn-task.manager";
import type { SvnSyncService } from "../svn-sync.service";
import type { IEventBus } from "@yinuo-ngm/event";
import type { SvnEventMap } from "../svn.events";
import path from "node:path";
import { createSqliteDatabase } from "@yinuo-ngm/storage";
import { SqliteSvnRuntimeRepo } from "./sqlite-svn-runtime.repo";

export function createSvnDomain(opts: {
    dataDir: string;
    events: IEventBus<SvnEventMap>;
    sysLog: SystemLogService;
    project: ProjectService;
}): SvnSyncService {
    const runtimeDir = path.join(opts.dataDir, "runtime");
    const svnRepo = new SqliteSvnRuntimeRepo(
        createSqliteDatabase(path.join(runtimeDir, "svn.runtime.db")),
        path.join(runtimeDir, "svn.runtime.json")
    );
    const svnTaskManager = new SvnTaskManager();
    return new SvnSyncServiceImpl(
        svnRepo,
        opts.events,
        opts.sysLog,
        svnTaskManager,
        opts.project
    );
}
