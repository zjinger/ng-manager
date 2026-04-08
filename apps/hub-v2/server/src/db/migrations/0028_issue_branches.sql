CREATE TABLE IF NOT EXISTS issue_branches (
  id TEXT PRIMARY KEY,
  issue_id TEXT NOT NULL,
  owner_user_id TEXT NOT NULL,
  owner_user_name TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'todo',
  summary TEXT NULL,
  started_at TEXT NULL,
  finished_at TEXT NULL,
  created_by_id TEXT NOT NULL,
  created_by_name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_issue_branches_issue_id
  ON issue_branches(issue_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_issue_branches_owner_user_id
  ON issue_branches(owner_user_id, status, updated_at DESC);
