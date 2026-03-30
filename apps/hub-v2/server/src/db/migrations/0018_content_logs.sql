CREATE TABLE IF NOT EXISTS content_logs (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  content_type TEXT NOT NULL CHECK (content_type IN ('announcement', 'document', 'release')),
  content_id TEXT NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('created', 'updated', 'published', 'archived')),
  title TEXT NOT NULL,
  summary TEXT,
  operator_id TEXT,
  operator_name TEXT,
  meta_json TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_content_logs_project_id ON content_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_content_logs_type_action ON content_logs(content_type, action_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_logs_created_at ON content_logs(created_at DESC);

