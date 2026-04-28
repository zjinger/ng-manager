import type { SystemLogService } from "@yinuo-ngm/logger";
import type { ProjectService } from "@yinuo-ngm/project";
import type { TaskService } from "@yinuo-ngm/task";
import { ProjectBootstrapServiceImpl } from "../project-bootstrap.service.impl";
import type { ProjectBootstrapService } from "../bootstrap.service";

export function createBootstrapDomain(opts: {
    project: ProjectService;
    task: TaskService;
    events: any;
    sysLog: SystemLogService;
}): ProjectBootstrapService {
    return new ProjectBootstrapServiceImpl(
        opts.project,
        opts.task,
        opts.events,
        opts.sysLog
    );
}