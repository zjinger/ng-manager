import type { ProjectService } from '@yinuo-ngm/project';
import type { ProcessService } from '@yinuo-ngm/process';
import type { NodeVersionService } from '@yinuo-ngm/node-version';
import type { IEventBus } from '@yinuo-ngm/event';
import type { TaskService } from '../task.service';
import { TaskServiceImpl } from '../task.service.impl';
import type { ILogStore, SystemLogService } from '@yinuo-ngm/logger';
import type { TaskEventMap } from './task-event-map';

export function createTaskDomain(opts: {
    projectService: ProjectService;
    processService: ProcessService;
    sysLog: SystemLogService;
    taskLogStore: ILogStore;
    events: IEventBus<any>;
    nodeVersionService: NodeVersionService;
}): TaskService {
    return new TaskServiceImpl(
        opts.projectService,
        opts.processService,
        opts.sysLog,
        opts.taskLogStore,
        opts.events as IEventBus<TaskEventMap>,
        opts.nodeVersionService
    );
}
