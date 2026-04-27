import type { SystemLogService } from "@yinuo-ngm/logger";
import { type ProjectService } from "@yinuo-ngm/project";
import { ProjectBootstrapService } from "../../domain/project";
import type { TaskService } from "@yinuo-ngm/task";
import type { CoreEventMap } from "../../infra/event/events";
import type { IEventBus } from "@yinuo-ngm/event";

export function createBootstrapDomain(opts: {
    project: ProjectService;
    task: TaskService;
    events: IEventBus<CoreEventMap>;
    sysLog: SystemLogService;
}) {
    return new ProjectBootstrapService(
        opts.project,
        opts.task,
        opts.events,
        opts.sysLog
    );
}
