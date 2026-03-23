-- Hub v2 post-0012 consolidated baseline
-- Purpose:
-- 1) Provide a compact schema reference for late-stage patch migrations.
-- 2) Bootstrap brand-new environments when needed.
--
-- IMPORTANT:
-- - This file is not used by runtime migration runner.
-- - Do not move this file into `src/db/migrations`.

-- admin_accounts final shape (post-0013)
CREATE TABLE IF NOT EXISTS admin_accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  nickname TEXT NOT NULL,
  avatar_upload_id TEXT,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'user')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  must_change_password INTEGER NOT NULL DEFAULT 1 CHECK (must_change_password IN (0, 1)),
  last_login_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_accounts_user_id
  ON admin_accounts(user_id)
  WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_admin_accounts_status ON admin_accounts(status);
CREATE INDEX IF NOT EXISTS idx_admin_accounts_role ON admin_accounts(role);
CREATE INDEX IF NOT EXISTS idx_admin_accounts_avatar_upload_id ON admin_accounts(avatar_upload_id);

-- dashboard_preferences (0013)
CREATE TABLE IF NOT EXISTS dashboard_preferences (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  stats_config_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_dashboard_preferences_user_id
  ON dashboard_preferences(user_id);

-- rd_items final uniqueness (0014)
CREATE TABLE IF NOT EXISTS rd_items (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  rd_no TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  stage_id TEXT,
  type TEXT NOT NULL,
  status TEXT NOT NULL,
  priority TEXT NOT NULL,
  assignee_id TEXT,
  assignee_name TEXT,
  creator_id TEXT NOT NULL,
  creator_name TEXT NOT NULL,
  reviewer_id TEXT,
  reviewer_name TEXT,
  progress INTEGER NOT NULL DEFAULT 0,
  plan_start_at TEXT,
  plan_end_at TEXT,
  actual_start_at TEXT,
  actual_end_at TEXT,
  blocker_reason TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (stage_id) REFERENCES rd_stages(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_rd_items_project_rd_no
  ON rd_items(project_id, rd_no);
CREATE INDEX IF NOT EXISTS idx_rd_items_project_id ON rd_items(project_id);
CREATE INDEX IF NOT EXISTS idx_rd_items_stage_id ON rd_items(stage_id);
CREATE INDEX IF NOT EXISTS idx_rd_items_status ON rd_items(status);
CREATE INDEX IF NOT EXISTS idx_rd_items_assignee_id ON rd_items(assignee_id);
CREATE INDEX IF NOT EXISTS idx_rd_items_updated_at ON rd_items(updated_at DESC);

-- rd_logs FK fixed after rd_items rebuild (0015)
CREATE TABLE IF NOT EXISTS rd_logs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  content TEXT,
  operator_id TEXT,
  operator_name TEXT,
  meta_json TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (item_id) REFERENCES rd_items(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_rd_logs_item_id ON rd_logs(item_id, created_at DESC);

-- project meta tables (0016)
CREATE TABLE IF NOT EXISTS project_modules (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  code TEXT,
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  sort INTEGER NOT NULL DEFAULT 0,
  "desc" TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(project_id, name),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_project_modules_project_id
  ON project_modules(project_id);

CREATE TABLE IF NOT EXISTS project_environments (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  code TEXT,
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  sort INTEGER NOT NULL DEFAULT 0,
  "desc" TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(project_id, name),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_project_environments_project_id
  ON project_environments(project_id);

CREATE TABLE IF NOT EXISTS project_versions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  version TEXT NOT NULL,
  code TEXT,
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  sort INTEGER NOT NULL DEFAULT 0,
  "desc" TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(project_id, version),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_project_versions_project_id
  ON project_versions(project_id);

-- feedbacks (0017)
CREATE TABLE IF NOT EXISTS feedbacks (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  contact TEXT,
  client_name TEXT,
  client_version TEXT,
  client_ip TEXT,
  os_info TEXT,
  project_key TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_feedbacks_status ON feedbacks(status);
CREATE INDEX IF NOT EXISTS idx_feedbacks_category ON feedbacks(category);
CREATE INDEX IF NOT EXISTS idx_feedbacks_created_at ON feedbacks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedbacks_project_key ON feedbacks(project_key);
CREATE INDEX IF NOT EXISTS idx_feedbacks_project_key_status ON feedbacks(project_key, status);
