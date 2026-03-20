CREATE TABLE IF NOT EXISTS shared_configs (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  scope TEXT NOT NULL DEFAULT 'global' CHECK (scope IN ('global', 'project')),
  config_key TEXT NOT NULL,
  config_name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  value_type TEXT NOT NULL DEFAULT 'json',
  config_value TEXT NOT NULL,
  description TEXT,
  is_encrypted INTEGER NOT NULL DEFAULT 0 CHECK (is_encrypted IN (0, 1)),
  priority INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_shared_configs_project_id ON shared_configs(project_id);
CREATE INDEX IF NOT EXISTS idx_shared_configs_scope ON shared_configs(scope);
CREATE INDEX IF NOT EXISTS idx_shared_configs_status ON shared_configs(status);
CREATE INDEX IF NOT EXISTS idx_shared_configs_project_scope ON shared_configs(project_id, scope);
CREATE UNIQUE INDEX IF NOT EXISTS uk_shared_configs_project_key
  ON shared_configs(project_id, config_key);
