import type { SqliteDatabase } from "../sqlite";

export function initTaskAnalyzeReportSchema(db: SqliteDatabase): void {
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
