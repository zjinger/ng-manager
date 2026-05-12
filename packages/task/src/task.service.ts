import type { LogLine } from '@yinuo-ngm/protocol';
import type { TaskAnalyzeDiagnostic, TaskAnalyzeReportSummary, TaskAnalyzeResult } from './analyzer/task-analyzer.types';
import type { TaskRuntime, TaskDefinition, TaskRow, TaskDashboard } from './task.types';

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
    getReportByRunId(runId: string): Promise<TaskAnalyzeResult | null>;
    getLatestReportByTaskId(taskId: string): Promise<TaskAnalyzeResult | null>;
    getDiagnosticsByRunId(runId: string): Promise<TaskAnalyzeDiagnostic[]>;
    getLatestDiagnosticsByTaskId(taskId: string): Promise<TaskAnalyzeDiagnostic[]>;
    listReportsByTaskId(taskId: string, limit?: number): Promise<TaskAnalyzeResult[]>;
    listReportsByProjectId(projectId: string, limit?: number): Promise<TaskAnalyzeResult[]>;
    listReportSummariesByTaskId(taskId: string, limit?: number): Promise<TaskAnalyzeReportSummary[]>;
    listReportSummariesByProjectId(projectId: string, limit?: number): Promise<TaskAnalyzeReportSummary[]>;
    getDashboardByTaskId(taskId: string): Promise<TaskDashboard | null>;
    getTailLogsByRun(runId: string, tail: number): Promise<LogLine[]>;
    getSyslogTail(tail: number): Promise<LogLine[]>;
    resizeRun(taskId: string, cols: number, rows: number): void;
    registerSpec(spec: TaskDefinition): void;
}
