-- 项目功能进展
CREATE TABLE IF NOT EXISTS project_feature_progress_settings (
  project_id TEXT PRIMARY KEY,
  enabled INTEGER NOT NULL DEFAULT 0 CHECK (enabled IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- 具体功能点
CREATE TABLE IF NOT EXISTS project_feature_point_groups (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  parent_id TEXT,
  name TEXT NOT NULL,
  manual_progress INTEGER CHECK (manual_progress IS NULL OR (manual_progress >= 0 AND manual_progress <= 100)),
  sort INTEGER NOT NULL DEFAULT 0,
  remark TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(project_id, parent_id, name),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES project_feature_point_groups(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_project_feature_point_groups_project_parent
  ON project_feature_point_groups(project_id, parent_id, sort, name);

CREATE TABLE IF NOT EXISTS project_feature_points (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  module_id TEXT,
  module_group_id TEXT,
  submodule_group_id TEXT,
  module_name TEXT,
  submodule_name TEXT,
  owner_user_id TEXT,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done', 'paused')),
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  sort INTEGER NOT NULL DEFAULT 0,
  remark TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (module_id) REFERENCES project_modules(id) ON DELETE SET NULL,
  FOREIGN KEY (module_group_id) REFERENCES project_feature_point_groups(id) ON DELETE SET NULL,
  FOREIGN KEY (submodule_group_id) REFERENCES project_feature_point_groups(id) ON DELETE SET NULL,
  FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_project_feature_points_project_sort
  ON project_feature_points(project_id, sort, created_at);

CREATE INDEX IF NOT EXISTS idx_project_feature_points_project_module
  ON project_feature_points(project_id, module_id);

CREATE INDEX IF NOT EXISTS idx_project_feature_points_group_names
  ON project_feature_points(project_id, module_name, submodule_name);

CREATE INDEX IF NOT EXISTS idx_project_feature_points_group_ids
  ON project_feature_points(project_id, module_group_id, submodule_group_id);

CREATE INDEX IF NOT EXISTS idx_project_feature_points_owner
  ON project_feature_points(owner_user_id);

CREATE TABLE IF NOT EXISTS project_feature_point_owners (
  feature_point_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  sort INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  PRIMARY KEY (feature_point_id, user_id),
  FOREIGN KEY (feature_point_id) REFERENCES project_feature_points(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_project_feature_point_owners_user
  ON project_feature_point_owners(user_id);

CREATE TABLE IF NOT EXISTS project_feature_progress_overrides (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('project', 'module')),
  target_id TEXT NOT NULL,
  progress INTEGER NOT NULL CHECK (progress >= 0 AND progress <= 100),
  remark TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(project_id, target_type, target_id),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_project_feature_progress_overrides_project
  ON project_feature_progress_overrides(project_id, target_type, target_id);
