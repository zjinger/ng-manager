import type { NodeVersionService } from "@yinuo-ngm/node-version";
import type { ProcessService } from "@yinuo-ngm/process";
import type { ProjectService } from "../../domain/project";
import { TaskServiceImpl } from "../../domain/task/task.service.impl";
import type { CoreEventMap } from "../../infra/event/events";
import type { IEventBus } from "../../infra/event/event-bus";
import type { RingLogStore } from "../../infra/log/ring-log-store";
import type { SystemLogService } from "../../domain/logger";

export function createTaskDomain(opts: {
    project: ProjectService;
    processService: ProcessService;
    sysLog: SystemLogService;
    taskStreamLogStore: RingLogStore;
    events: IEventBus<CoreEventMap>;
    nodeVersion: NodeVersionService;
}) {
    return new TaskServiceImpl(
        opts.project,
        opts.processService,
        opts.sysLog,
        opts.taskStreamLogStore,
        opts.events,
        opts.nodeVersion
    );
}
