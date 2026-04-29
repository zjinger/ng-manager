import { createSvnDomain as createSvnDomainImpl } from "@yinuo-ngm/svn";
import type { SystemLogService } from "@yinuo-ngm/logger";
import type { ProjectService } from "@yinuo-ngm/project";
import type { IEventBus } from "@yinuo-ngm/event";
import type { CoreEventMap } from "../../infra/event/events";

export function createSvnDomain(opts: {
    dataDir: string;
    events: IEventBus<CoreEventMap>;
    sysLog: SystemLogService;
    project: ProjectService;
}) {
    return createSvnDomainImpl({
        dataDir: opts.dataDir,
        events: opts.events,
        sysLog: opts.sysLog,
        project: opts.project,
    });
}
