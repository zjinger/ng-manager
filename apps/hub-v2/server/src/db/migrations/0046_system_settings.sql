CREATE TABLE IF NOT EXISTS system_settings (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL UNIQUE,
  settings_data TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_system_settings_category ON system_settings(category);
