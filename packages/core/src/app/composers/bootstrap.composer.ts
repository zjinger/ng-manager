import type { SystemLogService } from "../../domain/logger";
import { ProjectBootstrapService, type ProjectService } from "../../domain/project";
import type { TaskService } from "../../domain/task";
import type { CoreEventMap } from "../../infra/event/events";
import type { IEventBus } from "../../infra/event/event-bus";

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
