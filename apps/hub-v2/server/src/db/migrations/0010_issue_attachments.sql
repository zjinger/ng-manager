CREATE TABLE IF NOT EXISTS issue_attachments (
  id TEXT PRIMARY KEY,
  issue_id TEXT NOT NULL,
  upload_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE,
  FOREIGN KEY (upload_id) REFERENCES uploads(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_issue_attachments_issue_upload
  ON issue_attachments(issue_id, upload_id);

CREATE INDEX IF NOT EXISTS idx_issue_attachments_issue_id ON issue_attachments(issue_id, created_at ASC);
