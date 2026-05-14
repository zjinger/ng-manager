CREATE TABLE IF NOT EXISTS system_roles (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  is_builtin INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  sort INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_system_roles_status ON system_roles(status);
CREATE INDEX IF NOT EXISTS idx_system_roles_sort ON system_roles(sort, name);

CREATE TABLE IF NOT EXISTS system_permissions (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  group_code TEXT NOT NULL,
  group_name TEXT NOT NULL,
  description TEXT,
  sort INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_system_permissions_group ON system_permissions(group_code, sort);

CREATE TABLE IF NOT EXISTS system_role_permissions (
  role_id TEXT NOT NULL,
  permission_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (role_id, permission_id),
  FOREIGN KEY (role_id) REFERENCES system_roles(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES system_permissions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_system_role_permissions_permission ON system_role_permissions(permission_id);

CREATE TABLE IF NOT EXISTS user_system_roles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  role_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (user_id, role_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES system_roles(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_system_roles_user_id ON user_system_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_system_roles_role_id ON user_system_roles(role_id);

INSERT OR IGNORE INTO system_roles (id, code, name, description, is_builtin, status, sort, created_at, updated_at)
VALUES
  ('srole_super_admin', 'super_admin', '超级管理员', '拥有系统全部管理权限，作为后续 RBAC 接管的最高权限角色。', 1, 'active', 10, datetime('now'), datetime('now')),
  ('srole_admin', 'admin', '管理员', '对应现有 admin 账号语义，可管理后台基础能力。', 1, 'active', 20, datetime('now'), datetime('now')),
  ('srole_member', 'member', '成员', '对应现有普通协作成员账号语义。', 1, 'active', 30, datetime('now'), datetime('now'));

INSERT OR IGNORE INTO system_permissions (id, code, name, group_code, group_name, description, sort, created_at, updated_at)
VALUES
  ('sperm_admin_dashboard_view', 'admin.dashboard.view', '查看仪表盘', 'admin', '后台管理', '访问后台仪表盘。', 10, datetime('now'), datetime('now')),
  ('sperm_admin_users_manage', 'admin.users.manage', '管理用户', 'admin', '后台管理', '维护用户账号和用户部门关系。', 20, datetime('now'), datetime('now')),
  ('sperm_admin_departments_manage', 'admin.departments.manage', '管理部门组织', 'admin', '后台管理', '维护部门组织结构。', 30, datetime('now'), datetime('now')),
  ('sperm_admin_roles_manage', 'admin.roles.manage', '管理系统角色', 'admin', '后台管理', '维护系统角色、权限与成员授权。', 40, datetime('now'), datetime('now')),
  ('sperm_admin_projects_manage', 'admin.projects.manage', '管理项目治理', 'admin', '后台管理', '维护后台项目治理入口。', 50, datetime('now'), datetime('now')),
  ('sperm_admin_audit_view', 'admin.audit.view', '查看审计日志', 'admin', '后台管理', '查看后台审计日志。', 60, datetime('now'), datetime('now')),
  ('sperm_admin_settings_manage', 'admin.settings.manage', '管理系统设置', 'admin', '后台管理', '维护系统设置。', 70, datetime('now'), datetime('now'));

INSERT OR IGNORE INTO system_role_permissions (role_id, permission_id, created_at)
SELECT 'srole_super_admin', id, datetime('now') FROM system_permissions;

INSERT OR IGNORE INTO system_role_permissions (role_id, permission_id, created_at)
SELECT 'srole_admin', id, datetime('now')
FROM system_permissions
WHERE code IN (
  'admin.dashboard.view',
  'admin.users.manage',
  'admin.departments.manage',
  'admin.roles.manage',
  'admin.projects.manage'
);

INSERT OR IGNORE INTO system_role_permissions (role_id, permission_id, created_at)
SELECT 'srole_member', id, datetime('now')
FROM system_permissions
WHERE code = 'admin.dashboard.view';

INSERT OR IGNORE INTO user_system_roles (id, user_id, role_id, created_at)
SELECT 'usr_admin_' || aa.user_id, aa.user_id, 'srole_admin', datetime('now')
FROM admin_accounts aa
WHERE aa.role = 'admin' AND aa.user_id IS NOT NULL;

INSERT OR IGNORE INTO user_system_roles (id, user_id, role_id, created_at)
SELECT 'usr_member_' || aa.user_id, aa.user_id, 'srole_member', datetime('now')
FROM admin_accounts aa
WHERE aa.role = 'user' AND aa.user_id IS NOT NULL;
