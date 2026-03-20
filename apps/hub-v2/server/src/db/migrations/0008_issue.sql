CREATE TABLE IF NOT EXISTS issues (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  issue_no TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL,
  status TEXT NOT NULL,
  priority TEXT NOT NULL,
  reporter_id TEXT NOT NULL,
  reporter_name TEXT NOT NULL,
  assignee_id TEXT,
  assignee_name TEXT,
  verifier_id TEXT,
  verifier_name TEXT,
  module_code TEXT,
  version_code TEXT,
  environment_code TEXT,
  resolution_summary TEXT,
  close_reason TEXT,
  close_remark TEXT,
  reopen_count INTEGER NOT NULL DEFAULT 0,
  started_at TEXT,
  resolved_at TEXT,
  verified_at TEXT,
  closed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

CREATE INDEX IF NOT EXISTS idx_issues_project_id ON issues(project_id);
CREATE INDEX IF NOT EXISTS idx_issues_status ON issues(status);
CREATE INDEX IF NOT EXISTS idx_issues_assignee_id ON issues(assignee_id);
CREATE INDEX IF NOT EXISTS idx_issues_verifier_id ON issues(verifier_id);
CREATE INDEX IF NOT EXISTS idx_issues_updated_at ON issues(updated_at DESC);

CREATE TABLE IF NOT EXISTS issue_logs (
  id TEXT PRIMARY KEY,
  issue_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT,
  operator_id TEXT,
  operator_name TEXT,
  summary TEXT,
  meta_json TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_issue_logs_issue_id ON issue_logs(issue_id, created_at DESC);
