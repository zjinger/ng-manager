-- AI 积木报表模板表
CREATE TABLE IF NOT EXISTS report_templates (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  natural_query TEXT NOT NULL,
  sql TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_report_templates_created_by
  ON report_templates(created_by);
