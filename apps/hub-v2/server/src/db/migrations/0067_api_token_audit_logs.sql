CREATE TABLE IF NOT EXISTS api_token_audit_logs (
  id TEXT PRIMARY KEY,
  token_type TEXT NOT NULL CHECK (token_type IN ('project', 'personal')),
  token_id TEXT NOT NULL,
  actor_user_id TEXT,
  project_id TEXT,
  project_key TEXT,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  ip TEXT,
  user_agent TEXT,
  metadata_json TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_api_token_audit_logs_token
  ON api_token_audit_logs(token_type, token_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_api_token_audit_logs_project
  ON api_token_audit_logs(project_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_api_token_audit_logs_action
  ON api_token_audit_logs(action, created_at DESC);
