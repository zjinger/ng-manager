import { TaskServiceImpl } from '@yinuo-ngm/task';
import type { NodeVersionService } from '@yinuo-ngm/node-version';
import type { ProcessService } from '@yinuo-ngm/process';
import type { ProjectService } from '@yinuo-ngm/project';
import type { TaskService } from '@yinuo-ngm/task';
import type { TaskLogStore, SystemLogService, TaskEventMap } from '@yinuo-ngm/task';
import type { IEventBus } from '@yinuo-ngm/event';
import type { CoreEventMap } from '../../infra/event/events';

export function createTaskDomain(opts: {
    project: ProjectService;
    processService: ProcessService;
    sysLog: SystemLogService;
    taskStreamLogStore: TaskLogStore;
    events: IEventBus<CoreEventMap>;
    nodeVersion: NodeVersionService;
}): TaskService {
    return new TaskServiceImpl(
        opts.project,
        opts.processService,
        opts.sysLog,
        opts.taskStreamLogStore,
        opts.events as IEventBus<TaskEventMap>,
        opts.nodeVersion
    );
}

export type { TaskService };
