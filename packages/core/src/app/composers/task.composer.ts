import { TaskServiceImpl, type TaskAnalyzeReportStore } from '@yinuo-ngm/task';
import type { NodeVersionService } from '@yinuo-ngm/node-version';
import type { ProcessService } from '@yinuo-ngm/process';
import type { ProjectService } from '@yinuo-ngm/project';
import type { TaskService } from '@yinuo-ngm/task';
import type { ILogStore, SystemLogService } from '@yinuo-ngm/logger';
import type { IEventBus } from '@yinuo-ngm/event';
import type { CoreEventMap } from '../../infra/event/events';
import { SqliteTaskAnalyzeReportRepo, type SqliteDatabase } from '@yinuo-ngm/storage';

export function createTaskDomain(opts: {
    project: ProjectService;
    processService: ProcessService;
    sysLog: SystemLogService;
    taskStreamLogStore: ILogStore;
    events: IEventBus<CoreEventMap>;
    nodeVersion: NodeVersionService;
    db?: SqliteDatabase;
}): TaskService {
    const reportStore = opts.db ? new SqliteTaskAnalyzeReportRepo(opts.db) as unknown as TaskAnalyzeReportStore : undefined;
    return new TaskServiceImpl(
        opts.project,
        opts.processService,
        opts.sysLog,
        opts.taskStreamLogStore,
        opts.events,
        opts.nodeVersion,
        undefined,
        reportStore
    );
}

export type { TaskService };
