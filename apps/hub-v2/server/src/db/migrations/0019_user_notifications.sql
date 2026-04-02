CREATE TABLE IF NOT EXISTS user_notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  source_label TEXT NOT NULL,
  project_id TEXT,
  route TEXT NOT NULL,
  unread INTEGER NOT NULL DEFAULT 1,
  read_at TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_notifications_user_created
ON user_notifications (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_notifications_user_unread
ON user_notifications (user_id, unread, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_notifications_user_project
ON user_notifications (user_id, project_id, created_at DESC);
