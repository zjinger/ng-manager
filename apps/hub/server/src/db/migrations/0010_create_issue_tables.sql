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

  reopen_count INTEGER NOT NULL DEFAULT 0,

  module TEXT,
  version TEXT,
  environment TEXT,

  fixed_at TEXT,
  verified_at TEXT,
  closed_at TEXT,

  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,

  FOREIGN KEY (project_id) REFERENCES projects(id)
);

CREATE INDEX IF NOT EXISTS idx_issues_project_id
ON issues(project_id);

CREATE INDEX IF NOT EXISTS idx_issues_status
ON issues(status);

CREATE TABLE IF NOT EXISTS issue_comments (
  id TEXT PRIMARY KEY,
  issue_id TEXT NOT NULL,

  author_id TEXT,
  author_name TEXT,

  content TEXT NOT NULL,

  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,

  FOREIGN KEY (issue_id) REFERENCES issues(id)
);

CREATE INDEX IF NOT EXISTS idx_issue_comments_issue
ON issue_comments(issue_id);


CREATE TABLE IF NOT EXISTS issue_attachments (
  id TEXT PRIMARY KEY,
  issue_id TEXT NOT NULL,

  file_name TEXT NOT NULL,
  original_name TEXT NOT NULL,
  file_ext TEXT,
  mime_type TEXT,
  file_size INTEGER NOT NULL DEFAULT 0,

  storage_path TEXT NOT NULL,
  storage_provider TEXT NOT NULL DEFAULT 'local',

  uploader_id TEXT,
  uploader_name TEXT,

  created_at TEXT NOT NULL,

  FOREIGN KEY (issue_id) REFERENCES issues(id)
);

CREATE INDEX IF NOT EXISTS idx_issue_attachments_issue
ON issue_attachments(issue_id);


CREATE TABLE IF NOT EXISTS issue_action_logs (
  id TEXT PRIMARY KEY,
  issue_id TEXT NOT NULL,

  action_type TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT,

  operator_id TEXT,
  operator_name TEXT,

  summary TEXT,

  created_at TEXT NOT NULL,

  FOREIGN KEY (issue_id) REFERENCES issues(id)
);

CREATE INDEX IF NOT EXISTS idx_issue_logs_issue
ON issue_action_logs(issue_id);