ALTER TABLE project_modules ADD COLUMN owner_user_id TEXT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE project_modules ADD COLUMN icon_code TEXT;
ALTER TABLE project_modules ADD COLUMN priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('critical', 'high', 'medium', 'low'));
ALTER TABLE project_modules ADD COLUMN status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'released', 'paused'));
ALTER TABLE project_modules ADD COLUMN progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100);

CREATE INDEX IF NOT EXISTS idx_project_modules_owner_user_id
  ON project_modules(owner_user_id);

CREATE INDEX IF NOT EXISTS idx_project_modules_status
  ON project_modules(status);

CREATE UNIQUE INDEX IF NOT EXISTS uq_project_modules_project_code
  ON project_modules(project_id, code)
  WHERE code IS NOT NULL;

CREATE TABLE IF NOT EXISTS project_module_members (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  module_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role_code TEXT NOT NULL DEFAULT 'member',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (module_id) REFERENCES project_modules(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_project_module_members_module_user
  ON project_module_members(module_id, user_id);

CREATE INDEX IF NOT EXISTS idx_project_module_members_project
  ON project_module_members(project_id, module_id);

