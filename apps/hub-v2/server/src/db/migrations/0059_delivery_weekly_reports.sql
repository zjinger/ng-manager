CREATE TABLE IF NOT EXISTS delivery_weekly_reports (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  project_key TEXT NOT NULL,
  project_name TEXT NOT NULL,
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  title TEXT NOT NULL,
  summary_json TEXT NOT NULL,
  metrics_json TEXT NOT NULL,
  stages_json TEXT NOT NULL,
  key_items_json TEXT NOT NULL,
  attentions_json TEXT NOT NULL,
  created_by_id TEXT NOT NULL,
  created_by_name TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_delivery_weekly_reports_project_created
  ON delivery_weekly_reports(project_id, created_at DESC);
