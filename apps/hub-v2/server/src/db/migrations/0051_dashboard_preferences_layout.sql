DROP TABLE IF EXISTS dashboard_preferences;

CREATE TABLE dashboard_preferences (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  dashboard_code TEXT NOT NULL DEFAULT 'home',
  layout_json TEXT NOT NULL DEFAULT '[]',
  stats_config_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(user_id, dashboard_code),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_dashboard_preferences_user_id
  ON dashboard_preferences(user_id);

CREATE INDEX IF NOT EXISTS idx_dashboard_preferences_code
  ON dashboard_preferences(dashboard_code);
