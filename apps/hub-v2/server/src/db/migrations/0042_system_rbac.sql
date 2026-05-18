-- [0042] 系统 RBAC 基础模型与初始化数据
-- Depends on: users, admin_accounts, 0041_user_org
-- Notes: 仅建立授权底座；admin 登录链路兼容层不在本迁移接管
-- Add columns to users table
ALTER TABLE users ADD COLUMN manager_user_id TEXT;
ALTER TABLE users ADD COLUMN finance_approver_user_id TEXT;
CREATE INDEX IF NOT EXISTS idx_users_manager_user_id ON users(manager_user_id);
CREATE INDEX IF NOT EXISTS idx_users_finance_approver_user_id ON users(finance_approver_user_id);

-- Create system roles table
CREATE TABLE IF NOT EXISTS system_roles (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  is_builtin INTEGER NOT NULL DEFAULT 0,
  purpose_code TEXT NOT NULL DEFAULT 'platform_admin',
  purpose_name TEXT NOT NULL DEFAULT '平台管理角色',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  sort INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_system_roles_status ON system_roles(status);
CREATE INDEX IF NOT EXISTS idx_system_roles_sort ON system_roles(sort, name);
CREATE INDEX IF NOT EXISTS idx_system_roles_purpose ON system_roles(purpose_code, status);

-- Create system permissions table
CREATE TABLE IF NOT EXISTS system_permissions (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  group_code TEXT NOT NULL,
  group_name TEXT NOT NULL,
  domain_code TEXT NOT NULL DEFAULT 'admin',
  domain_name TEXT NOT NULL DEFAULT '后台管理',
  description TEXT,
  sort INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_system_permissions_group ON system_permissions(group_code, sort);
CREATE INDEX IF NOT EXISTS idx_system_permissions_domain ON system_permissions(domain_code, group_code, sort);

-- Create role-permission association table
CREATE TABLE IF NOT EXISTS system_role_permissions (
  role_id TEXT NOT NULL,
  permission_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (role_id, permission_id),
  FOREIGN KEY (role_id) REFERENCES system_roles(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES system_permissions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_system_role_permissions_permission ON system_role_permissions(permission_id);

-- Create user system roles table
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

-- Insert initial data
INSERT OR IGNORE INTO system_roles (id, code, name, description, is_builtin, purpose_code, purpose_name, status, sort, created_at, updated_at)
VALUES
  ('srole_super_admin', 'super_admin', '超级管理员', '拥有系统全部管理权限。', 1, 'hybrid', '混合角色', 'active', 10, datetime('now'), datetime('now')),
  ('srole_admin', 'admin', '管理员', '可管理后台基础能力。', 1, 'platform_admin', '平台管理角色', 'active', 20, datetime('now'), datetime('now')),
  ('srole_member', 'member', '成员', '普通协作成员账号。', 1, 'platform_member', '平台成员角色', 'active', 30, datetime('now'), datetime('now'));

INSERT OR IGNORE INTO system_permissions (id, code, name, group_code, group_name, domain_code, domain_name, description, sort, created_at, updated_at)
VALUES
  ('sperm_admin_dashboard_view', 'admin.dashboard.view', '查看仪表盘', 'admin', '后台管理', 'admin', '后台管理', '访问后台仪表盘。', 10, datetime('now'), datetime('now')),
  ('sperm_admin_users_manage', 'admin.users.manage', '管理用户', 'admin', '后台管理', 'admin', '后台管理', '维护用户账号和用户部门关系。', 20, datetime('now'), datetime('now')),
  ('sperm_admin_departments_manage', 'admin.departments.manage', '管理部门组织', 'admin', '后台管理', 'admin', '后台管理', '维护部门组织结构。', 30, datetime('now'), datetime('now')),
  ('sperm_admin_roles_manage', 'admin.roles.manage', '管理系统角色', 'admin', '后台管理', 'admin', '后台管理', '维护系统角色、权限与成员授权。', 40, datetime('now'), datetime('now')),
  ('sperm_admin_projects_manage', 'admin.projects.manage', '管理项目', 'admin', '后台管理', 'admin', '后台管理', '维护后台项目管理入口。', 50, datetime('now'), datetime('now')),
  ('sperm_admin_audit_view', 'admin.audit.view', '查看审计日志', 'admin', '后台管理', 'admin', '后台管理', '查看后台审计日志。', 60, datetime('now'), datetime('now')),
  ('sperm_admin_settings_manage', 'admin.settings.manage', '管理系统设置', 'admin', '后台管理', 'admin', '后台管理', '维护系统设置。', 70, datetime('now'), datetime('now')),
  ('sperm_expense_submit', 'expense.submit', '提交报销', 'expense', '报销业务', 'expense', '财务报销', '创建并提交个人报销单。', 10, datetime('now'), datetime('now')),
  ('sperm_expense_view_self', 'expense.view.self', '查看本人报销', 'expense', '报销业务', 'expense', '财务报销', '查看本人报销记录。', 20, datetime('now'), datetime('now')),
  ('sperm_expense_report_view', 'expense.report.view', '查看报销报表', 'expense', '报销业务', 'expense', '财务报销', '查看报销统计报表。', 30, datetime('now'), datetime('now')),
  ('sperm_expense_rule_manage', 'expense.rule.manage', '管理报销规则', 'expense', '报销业务', 'expense', '财务报销', '维护报销规则与审批模板。', 40, datetime('now'), datetime('now')),
  ('sperm_approval_department', 'approval.department', '部门审批', 'approval', '审批能力', 'approval', '审批管理', '处理本部门审批。', 10, datetime('now'), datetime('now')),
  ('sperm_approval_cross_department', 'approval.cross_department', '跨部门审批', 'approval', '审批能力', 'approval', '审批管理', '处理跨部门审批。', 20, datetime('now'), datetime('now')),
  ('sperm_finance_review', 'finance.review', '财务复核', 'finance', '财务能力', 'finance', '财务管理', '进行财务复核。', 10, datetime('now'), datetime('now')),
  ('sperm_finance_cashier', 'finance.cashier', '出纳付款', 'finance', '财务能力', 'finance', '财务管理', '进行出纳付款处理。', 20, datetime('now'), datetime('now'));

-- Insert business roles
INSERT OR IGNORE INTO system_roles (id, code, name, description, is_builtin, purpose_code, purpose_name, status, sort, created_at, updated_at)
VALUES
  ('srole_expense_manager', 'expense_manager', '报销管理员', '维护报销规则、审批模板并查看报表。', 1, 'business', '业务角色', 'active', 110, datetime('now'), datetime('now')),
  ('srole_finance_reviewer', 'finance_reviewer', '财务复核', '具备财务复核能力。', 1, 'business', '业务角色', 'active', 120, datetime('now'), datetime('now')),
  ('srole_finance_cashier', 'finance_cashier', '出纳', '具备付款出纳能力。', 1, 'business', '业务角色', 'active', 130, datetime('now'), datetime('now'));

-- Assign permissions to roles
INSERT OR IGNORE INTO system_role_permissions (role_id, permission_id, created_at)
SELECT 'srole_super_admin', id, datetime('now') FROM system_permissions;

INSERT OR IGNORE INTO system_role_permissions (role_id, permission_id, created_at)
SELECT 'srole_admin', id, datetime('now')
FROM system_permissions
WHERE code IN ('admin.dashboard.view', 'admin.users.manage', 'admin.departments.manage', 'admin.roles.manage', 'admin.projects.manage');

INSERT OR IGNORE INTO system_role_permissions (role_id, permission_id, created_at)
SELECT 'srole_member', id, datetime('now')
FROM system_permissions
WHERE code IN ('expense.submit', 'expense.view.self');

INSERT OR IGNORE INTO system_role_permissions (role_id, permission_id, created_at)
SELECT 'srole_super_admin', id, datetime('now')
FROM system_permissions
WHERE domain_code IN ('expense', 'approval', 'finance');

INSERT OR IGNORE INTO system_role_permissions (role_id, permission_id, created_at)
SELECT 'srole_expense_manager', id, datetime('now')
FROM system_permissions
WHERE code IN ('expense.submit', 'expense.view.self', 'expense.report.view', 'expense.rule.manage');

INSERT OR IGNORE INTO system_role_permissions (role_id, permission_id, created_at)
SELECT 'srole_finance_reviewer', id, datetime('now')
FROM system_permissions
WHERE code IN ('expense.view.self', 'expense.report.view', 'finance.review');

INSERT OR IGNORE INTO system_role_permissions (role_id, permission_id, created_at)
SELECT 'srole_finance_cashier', id, datetime('now')
FROM system_permissions
WHERE code IN ('expense.view.self', 'expense.report.view', 'finance.cashier');

-- Assign roles to users
INSERT OR IGNORE INTO user_system_roles (id, user_id, role_id, created_at)
SELECT 'usr_admin_' || aa.user_id, aa.user_id, 'srole_admin', datetime('now')
FROM admin_accounts aa
WHERE aa.role = 'admin' AND aa.user_id IS NOT NULL;

INSERT OR IGNORE INTO user_system_roles (id, user_id, role_id, created_at)
SELECT 'usr_member_' || aa.user_id, aa.user_id, 'srole_member', datetime('now')
FROM admin_accounts aa
WHERE aa.role = 'user' AND aa.user_id IS NOT NULL;

-- Clean up old tables
DROP TABLE IF EXISTS user_finance_roles;
DROP TABLE IF EXISTS finance_roles;
