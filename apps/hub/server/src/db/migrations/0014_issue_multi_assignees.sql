CREATE TABLE IF NOT EXISTS issue_assignees (
  id TEXT PRIMARY KEY,
  issue_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_name TEXT,
  created_at TEXT NOT NULL,
  UNIQUE(issue_id, user_id),
  FOREIGN KEY(issue_id) REFERENCES issues(id)
);

CREATE INDEX IF NOT EXISTS idx_issue_assignees_issue_id
ON issue_assignees(issue_id);

CREATE INDEX IF NOT EXISTS idx_issue_assignees_user_id
ON issue_assignees(user_id);

