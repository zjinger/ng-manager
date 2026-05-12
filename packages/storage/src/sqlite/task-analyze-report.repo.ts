import type { SqliteDatabase } from "./sqlite";

export interface TaskAnalyzeReportSummaryRecord {
    runId: string;
    taskId: string;
    projectId: string;
    analyzer: string;
    createdAt: number;
    totalRawSize: number;
    totalGzipSize: number;
    totalBrotliSize?: number;
    jsRawSize: number;
    cssRawSize: number;
    assetRawSize: number;
    fileCount: number;
    durationMs?: number;
}

export interface TaskAnalyzeReportLike {
    runId: string;
    taskId: string;
    projectId: string;
    analyzer: string;
    createdAt: number;
    summary: {
        totalRawSize: number;
        totalGzipSize: number;
        totalBrotliSize?: number;
        jsRawSize: number;
        cssRawSize: number;
        assetRawSize: number;
        fileCount: number;
        jsFileCount: number;
        cssFileCount: number;
        assetFileCount: number;
        durationMs?: number;
    };
    stats?: unknown;
    assets?: unknown;
    warnings?: unknown;
    diagnostics?: unknown;
}

interface TaskAnalyzeReportRow {
    run_id: string;
    task_id: string;
    project_id: string;
    analyzer: string;
    created_at: number;
    summary_json: string;
    stats_json?: string | null;
    assets_json?: string | null;
    warnings_json?: string | null;
    diagnostics_json?: string | null;
    total_raw_size: number;
    total_gzip_size: number;
    total_brotli_size?: number | null;
    js_raw_size: number;
    css_raw_size: number;
    asset_raw_size: number;
    file_count: number;
    duration_ms?: number | null;
}

function createTaskAnalyzeReportTable(db: SqliteDatabase) {
    db.exec(`
        CREATE TABLE IF NOT EXISTS task_analyze_reports (
            id TEXT PRIMARY KEY,
            run_id TEXT NOT NULL,
            task_id TEXT NOT NULL,
            project_id TEXT NOT NULL,
            analyzer TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            summary_json TEXT NOT NULL,
            stats_json TEXT,
            assets_json TEXT,
            warnings_json TEXT,
            diagnostics_json TEXT,
            total_raw_size INTEGER NOT NULL,
            total_gzip_size INTEGER NOT NULL,
            total_brotli_size INTEGER,
            js_raw_size INTEGER NOT NULL,
            css_raw_size INTEGER NOT NULL,
            asset_raw_size INTEGER NOT NULL,
            file_count INTEGER NOT NULL,
            duration_ms INTEGER
        );

        CREATE INDEX IF NOT EXISTS idx_task_analyze_reports_task_id_created_at
            ON task_analyze_reports (task_id, created_at DESC);

        CREATE INDEX IF NOT EXISTS idx_task_analyze_reports_project_id_created_at
            ON task_analyze_reports (project_id, created_at DESC);

        CREATE INDEX IF NOT EXISTS idx_task_analyze_reports_run_id
            ON task_analyze_reports (run_id);
    `);
}

function limitValue(limit?: number): number {
    return Math.min(Math.max(Number(limit) || 20, 1), 100);
}

function reportId(report: TaskAnalyzeReportLike): string {
    return `${report.taskId}:${report.runId}`;
}

function json(value: unknown): string | null {
    return value === undefined ? null : JSON.stringify(value);
}

function rowToReport<T extends TaskAnalyzeReportLike = TaskAnalyzeReportLike>(row: TaskAnalyzeReportRow): T {
    return {
        runId: row.run_id,
        taskId: row.task_id,
        projectId: row.project_id,
        analyzer: row.analyzer,
        createdAt: row.created_at,
        summary: JSON.parse(row.summary_json),
        stats: row.stats_json ? JSON.parse(row.stats_json) : undefined,
        assets: row.assets_json ? JSON.parse(row.assets_json) : [],
        warnings: row.warnings_json ? JSON.parse(row.warnings_json) : undefined,
        diagnostics: row.diagnostics_json ? JSON.parse(row.diagnostics_json) : undefined,
    } as T;
}

function rowToSummary(row: TaskAnalyzeReportRow): TaskAnalyzeReportSummaryRecord {
    return {
        runId: row.run_id,
        taskId: row.task_id,
        projectId: row.project_id,
        analyzer: row.analyzer,
        createdAt: row.created_at,
        totalRawSize: row.total_raw_size,
        totalGzipSize: row.total_gzip_size,
        totalBrotliSize: row.total_brotli_size ?? undefined,
        jsRawSize: row.js_raw_size,
        cssRawSize: row.css_raw_size,
        assetRawSize: row.asset_raw_size,
        fileCount: row.file_count,
        durationMs: row.duration_ms ?? undefined,
    };
}

export class SqliteTaskAnalyzeReportRepo {
    constructor(private readonly db: SqliteDatabase) {
        createTaskAnalyzeReportTable(db);
    }

    save(report: TaskAnalyzeReportLike): void {
        const stmt = this.db.prepare(`
            INSERT INTO task_analyze_reports (
                id, run_id, task_id, project_id, analyzer, created_at,
                summary_json, stats_json, assets_json, warnings_json, diagnostics_json,
                total_raw_size, total_gzip_size, total_brotli_size,
                js_raw_size, css_raw_size, asset_raw_size, file_count, duration_ms
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                analyzer = excluded.analyzer,
                created_at = excluded.created_at,
                summary_json = excluded.summary_json,
                stats_json = excluded.stats_json,
                assets_json = excluded.assets_json,
                warnings_json = excluded.warnings_json,
                diagnostics_json = excluded.diagnostics_json,
                total_raw_size = excluded.total_raw_size,
                total_gzip_size = excluded.total_gzip_size,
                total_brotli_size = excluded.total_brotli_size,
                js_raw_size = excluded.js_raw_size,
                css_raw_size = excluded.css_raw_size,
                asset_raw_size = excluded.asset_raw_size,
                file_count = excluded.file_count,
                duration_ms = excluded.duration_ms
        `);

        stmt.run(
            reportId(report),
            report.runId,
            report.taskId,
            report.projectId,
            report.analyzer,
            report.createdAt,
            JSON.stringify(report.summary),
            json(report.stats),
            json(report.assets ?? []),
            json(report.warnings),
            json(report.diagnostics),
            report.summary.totalRawSize,
            report.summary.totalGzipSize,
            report.summary.totalBrotliSize ?? null,
            report.summary.jsRawSize,
            report.summary.cssRawSize,
            report.summary.assetRawSize,
            report.summary.fileCount,
            report.summary.durationMs ?? null
        );

        this.pruneTask(report.taskId);
    }

    getByRunId<T extends TaskAnalyzeReportLike = TaskAnalyzeReportLike>(runId: string): T | null {
        const row = this.db
            .prepare(`SELECT * FROM task_analyze_reports WHERE run_id = ? ORDER BY created_at DESC LIMIT 1`)
            .get(runId) as TaskAnalyzeReportRow | undefined;
        return row ? rowToReport<T>(row) : null;
    }

    listByTaskId<T extends TaskAnalyzeReportLike = TaskAnalyzeReportLike>(taskId: string, limit?: number): T[] {
        const rows = this.db
            .prepare(`SELECT * FROM task_analyze_reports WHERE task_id = ? ORDER BY created_at DESC LIMIT ?`)
            .all(taskId, limitValue(limit)) as TaskAnalyzeReportRow[];
        return rows.map((row) => rowToReport<T>(row));
    }

    listByProjectId<T extends TaskAnalyzeReportLike = TaskAnalyzeReportLike>(projectId: string, limit?: number): T[] {
        const rows = this.db
            .prepare(`SELECT * FROM task_analyze_reports WHERE project_id = ? ORDER BY created_at DESC LIMIT ?`)
            .all(projectId, limitValue(limit)) as TaskAnalyzeReportRow[];
        return rows.map((row) => rowToReport<T>(row));
    }

    listSummaryByTaskId(taskId: string, limit?: number): TaskAnalyzeReportSummaryRecord[] {
        const rows = this.db
            .prepare(`SELECT * FROM task_analyze_reports WHERE task_id = ? ORDER BY created_at DESC LIMIT ?`)
            .all(taskId, limitValue(limit)) as TaskAnalyzeReportRow[];
        return rows.map(rowToSummary);
    }

    listSummaryByProjectId(projectId: string, limit?: number): TaskAnalyzeReportSummaryRecord[] {
        const rows = this.db
            .prepare(`SELECT * FROM task_analyze_reports WHERE project_id = ? ORDER BY created_at DESC LIMIT ?`)
            .all(projectId, limitValue(limit)) as TaskAnalyzeReportRow[];
        return rows.map(rowToSummary);
    }

    private pruneTask(taskId: string) {
        this.db.prepare(`
            DELETE FROM task_analyze_reports
            WHERE task_id = ?
              AND id NOT IN (
                SELECT id FROM task_analyze_reports
                WHERE task_id = ?
                ORDER BY created_at DESC
                LIMIT 50
              )
        `).run(taskId, taskId);
    }
}
