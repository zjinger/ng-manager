import {
    TaskServiceImpl,
    type TaskAnalyzeReportStore,
    type TaskAnalyzeReportSummary,
    type TaskAnalyzeResult,
} from '@yinuo-ngm/task';
import type { NodeVersionService } from '@yinuo-ngm/node-version';
import type { ProcessService } from '@yinuo-ngm/process';
import type { ProjectService } from '@yinuo-ngm/project';
import type { TaskService } from '@yinuo-ngm/task';
import type { ILogStore, SystemLogService } from '@yinuo-ngm/logger';
import type { IEventBus } from '@yinuo-ngm/event';
import type { CoreEventMap } from '../../infra/event/events';
import { SqliteTaskAnalyzeReportRepo, type SqliteDatabase } from '@yinuo-ngm/storage';

class SqliteTaskAnalyzeReportStoreAdapter implements TaskAnalyzeReportStore {
    constructor(private readonly repo: SqliteTaskAnalyzeReportRepo) {}

    save(report: TaskAnalyzeResult): void {
        this.repo.save(report);
    }

    getByRunId(runId: string): TaskAnalyzeResult | null {
        return this.repo.getByRunId<TaskAnalyzeResult>(runId);
    }

    listByTaskId(taskId: string, limit?: number): TaskAnalyzeResult[] {
        return this.repo.listByTaskId<TaskAnalyzeResult>(taskId, limit);
    }

    listByProjectId(projectId: string, limit?: number): TaskAnalyzeResult[] {
        return this.repo.listByProjectId<TaskAnalyzeResult>(projectId, limit);
    }

    listSummaryByTaskId(taskId: string, limit?: number): TaskAnalyzeReportSummary[] {
        return this.repo.listSummaryByTaskId(taskId, limit);
    }

    listSummaryByProjectId(projectId: string, limit?: number): TaskAnalyzeReportSummary[] {
        return this.repo.listSummaryByProjectId(projectId, limit);
    }
}

export function createTaskDomain(opts: {
    project: ProjectService;
    processService: ProcessService;
    sysLog: SystemLogService;
    taskStreamLogStore: ILogStore;
    events: IEventBus<CoreEventMap>;
    nodeVersion: NodeVersionService;
    db?: SqliteDatabase;
}): TaskService {
    const reportStore = opts.db
        ? new SqliteTaskAnalyzeReportStoreAdapter(new SqliteTaskAnalyzeReportRepo(opts.db))
        : undefined;
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
