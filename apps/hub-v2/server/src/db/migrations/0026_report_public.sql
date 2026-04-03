-- 积木报表公开访问
CREATE TABLE IF NOT EXISTS report_public_settings (
  key TEXT PRIMARY KEY,
  enabled INTEGER NOT NULL DEFAULT 0 CHECK (enabled IN (0, 1)),
  updated_at TEXT NOT NULL
);

INSERT OR IGNORE INTO report_public_settings (key, enabled, updated_at)
VALUES ('global', 0, datetime('now'));

CREATE TABLE IF NOT EXISTS report_public_projects (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL UNIQUE,
  share_token TEXT NOT NULL UNIQUE,
  allow_all_projects INTEGER NOT NULL DEFAULT 0 CHECK (allow_all_projects IN (0, 1)),
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_report_public_projects_created_by
  ON report_public_projects(created_by);

CREATE TABLE IF NOT EXISTS report_public_templates (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  share_token TEXT NOT NULL,
  title TEXT NOT NULL,
  natural_query TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_report_public_templates_share_token
  ON report_public_templates(share_token);
