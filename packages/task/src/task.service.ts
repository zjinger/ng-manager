import type { LogLine } from '@yinuo-ngm/protocol';
import type { TaskRuntime, TaskDefinition, TaskRow } from './task.types';

export interface TaskService {
    start(taskId: string): Promise<TaskRuntime>;
    stop(taskId: string): Promise<TaskRuntime>;
    restart(taskId: string): Promise<TaskRuntime>;
    status(taskId: string): Promise<TaskRuntime>;
    listActive(): Promise<TaskRuntime[]>;
    refreshByProject(projectId: string, opts?: { pruneOrphan?: "none" | "safe" | "all" }): Promise<TaskRow[]>;
    listViewsByProject(projectId: string): Promise<TaskRow[]>;
    listSpecsByProject(projectId: string): Promise<TaskDefinition[]>;
    getSnapshot(runId: string): Promise<TaskRuntime | null>;
    getSnapshotByTaskId(taskId: string): Promise<TaskRuntime | null>;
    getTailLogsByRun(runId: string, tail: number): Promise<LogLine[]>;
    getSyslogTail(tail: number): Promise<LogLine[]>;
    resizeRun(taskId: string, cols: number, rows: number): void;
    registerSpec(spec: TaskDefinition): void;
}
