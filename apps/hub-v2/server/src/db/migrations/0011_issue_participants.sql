CREATE TABLE IF NOT EXISTS issue_participants (
  id TEXT PRIMARY KEY,
  issue_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_issue_participants_issue_user
  ON issue_participants(issue_id, user_id);

CREATE INDEX IF NOT EXISTS idx_issue_participants_issue_id ON issue_participants(issue_id, created_at ASC);
