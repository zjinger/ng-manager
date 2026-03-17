CREATE TABLE IF NOT EXISTS dashboard_preferences (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  stats_config_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_dashboard_preferences_user_id
  ON dashboard_preferences(user_id);
