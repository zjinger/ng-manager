CREATE TABLE IF NOT EXISTS issues (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,

  issue_no TEXT NOT NULL UNIQUE,

  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',

  type TEXT NOT NULL DEFAULT 'bug',
  status TEXT NOT NULL DEFAULT 'open',
  priority TEXT NOT NULL DEFAULT 'medium',

  reporter_id TEXT,
  reporter_name TEXT,

  assignee_id TEXT,
  assignee_name TEXT,

  verifier_id TEXT,
  verifier_name TEXT,

  reopen_count INTEGER NOT NULL DEFAULT 0,

  module TEXT,
  version TEXT,
  environment TEXT,

  resolved_at TEXT,
  verified_at TEXT,
  last_verified_result TEXT CHECK (
    last_verified_result IN ('pass', 'fail') OR last_verified_result IS NULL
  ),
  close_reason_type TEXT,
  close_reason_text TEXT,
  closed_at TEXT,

  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,

  FOREIGN KEY (project_id) REFERENCES projects(id)
);

CREATE INDEX IF NOT EXISTS idx_issues_project_id ON issues(project_id);
CREATE INDEX IF NOT EXISTS idx_issues_status ON issues(status);
CREATE INDEX IF NOT EXISTS idx_issues_assignee_id ON issues(assignee_id);
CREATE INDEX IF NOT EXISTS idx_issues_reporter_id ON issues(reporter_id);
CREATE INDEX IF NOT EXISTS idx_issues_verifier_id ON issues(verifier_id);
CREATE INDEX IF NOT EXISTS idx_issues_last_verified_result ON issues(last_verified_result);
CREATE INDEX IF NOT EXISTS idx_issues_updated_at ON issues(updated_at);

CREATE TABLE IF NOT EXISTS issue_comments (
  id TEXT PRIMARY KEY,
  issue_id TEXT NOT NULL,
  author_id TEXT,
  author_name TEXT,
  content TEXT NOT NULL,
  mentions_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_issue_comments_issue ON issue_comments(issue_id);

CREATE TABLE IF NOT EXISTS issue_attachments (
  id TEXT PRIMARY KEY,
  issue_id TEXT NOT NULL,
  upload_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE,
  UNIQUE(issue_id, upload_id)
);

CREATE INDEX IF NOT EXISTS idx_issue_attachments_issue ON issue_attachments(issue_id);
CREATE INDEX IF NOT EXISTS idx_issue_attachments_upload_id ON issue_attachments(upload_id);

CREATE TABLE IF NOT EXISTS issue_action_logs (
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

CREATE INDEX IF NOT EXISTS idx_issue_logs_issue ON issue_action_logs(issue_id);

CREATE TABLE IF NOT EXISTS issue_participants (
  id TEXT PRIMARY KEY,
  issue_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_name TEXT,
  created_at TEXT NOT NULL,
  UNIQUE(issue_id, user_id),
  FOREIGN KEY(issue_id) REFERENCES issues(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_issue_participants_issue_id ON issue_participants(issue_id);
CREATE INDEX IF NOT EXISTS idx_issue_participants_user_id ON issue_participants(user_id);

CREATE TABLE IF NOT EXISTS issue_watchers (
  id TEXT PRIMARY KEY,
  issue_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_name TEXT,
  created_at TEXT NOT NULL,
  UNIQUE(issue_id, user_id),
  FOREIGN KEY(issue_id) REFERENCES issues(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_issue_watchers_issue_id ON issue_watchers(issue_id);
CREATE INDEX IF NOT EXISTS idx_issue_watchers_user_id ON issue_watchers(user_id);
