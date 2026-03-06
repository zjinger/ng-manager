CREATE TABLE IF NOT EXISTS shared_configs (
  id TEXT PRIMARY KEY,
  config_key TEXT NOT NULL UNIQUE,
  config_value TEXT NOT NULL,
  value_type TEXT NOT NULL DEFAULT 'json',
  scope TEXT NOT NULL DEFAULT 'public',
  description TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_shared_configs_key ON shared_configs(config_key);
CREATE INDEX IF NOT EXISTS idx_shared_configs_scope ON shared_configs(scope);
CREATE INDEX IF NOT EXISTS idx_shared_configs_updated_at ON shared_configs(updated_at DESC);