ALTER TABLE users ADD COLUMN manager_user_id TEXT;
ALTER TABLE users ADD COLUMN finance_approver_user_id TEXT;
CREATE INDEX IF NOT EXISTS idx_users_manager_user_id ON users(manager_user_id);
CREATE INDEX IF NOT EXISTS idx_users_finance_approver_user_id ON users(finance_approver_user_id);

ALTER TABLE departments ADD COLUMN manager_user_id TEXT;
CREATE INDEX IF NOT EXISTS idx_departments_manager_user_id ON departments(manager_user_id);

ALTER TABLE system_roles ADD COLUMN purpose_code TEXT NOT NULL DEFAULT 'platform_admin';
ALTER TABLE system_roles ADD COLUMN purpose_name TEXT NOT NULL DEFAULT '平台管理角色';
CREATE INDEX IF NOT EXISTS idx_system_roles_purpose ON system_roles(purpose_code, status);

ALTER TABLE system_permissions ADD COLUMN domain_code TEXT NOT NULL DEFAULT 'admin';
ALTER TABLE system_permissions ADD COLUMN domain_name TEXT NOT NULL DEFAULT '后台管理';
CREATE INDEX IF NOT EXISTS idx_system_permissions_domain ON system_permissions(domain_code, group_code, sort);

UPDATE system_roles
SET purpose_code = 'hybrid', purpose_name = '混合角色', updated_at = datetime('now')
WHERE code = 'super_admin';

UPDATE system_roles
SET purpose_code = 'platform_admin', purpose_name = '平台管理角色', updated_at = datetime('now')
WHERE code IN ('admin', 'member');

UPDATE system_permissions
SET domain_code = 'admin', domain_name = '后台管理', updated_at = datetime('now');

DELETE FROM user_departments
WHERE rowid NOT IN (
  SELECT keep_rowid FROM (
    SELECT user_id, MIN(rowid) AS keep_rowid
    FROM user_departments
    GROUP BY user_id
  )
);

UPDATE user_departments
SET relation_type = 'primary', updated_at = datetime('now');

DROP INDEX IF EXISTS idx_user_departments_primary;
DROP INDEX IF EXISTS idx_user_departments_user_id;
DROP INDEX IF EXISTS idx_user_departments_department_id;

ALTER TABLE user_departments RENAME TO user_departments_legacy_0043;

CREATE TABLE user_departments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  department_id TEXT NOT NULL,
  relation_type TEXT NOT NULL DEFAULT 'primary' CHECK (relation_type = 'primary'),
  role_code TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(user_id, department_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
);

INSERT INTO user_departments (id, user_id, department_id, relation_type, role_code, created_at, updated_at)
SELECT id, user_id, department_id, 'primary', role_code, created_at, updated_at
FROM user_departments_legacy_0043;

DROP TABLE user_departments_legacy_0043;

CREATE INDEX IF NOT EXISTS idx_user_departments_user_id ON user_departments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_departments_department_id ON user_departments(department_id);

INSERT OR IGNORE INTO system_permissions (id, code, name, group_code, group_name, domain_code, domain_name, description, sort, created_at, updated_at)
VALUES
  ('sperm_expense_submit', 'expense.submit', '提交报销', 'expense', '报销业务', 'expense', '财务报销', '创建并提交个人报销单。', 10, datetime('now'), datetime('now')),
  ('sperm_expense_view_self', 'expense.view.self', '查看本人报销', 'expense', '报销业务', 'expense', '财务报销', '查看本人报销记录。', 20, datetime('now'), datetime('now')),
  ('sperm_expense_report_view', 'expense.report.view', '查看报销报表', 'expense', '报销业务', 'expense', '财务报销', '查看报销统计报表。', 30, datetime('now'), datetime('now')),
  ('sperm_expense_rule_manage', 'expense.rule.manage', '管理报销规则', 'expense', '报销业务', 'expense', '财务报销', '维护报销规则与审批模板。', 40, datetime('now'), datetime('now')),
  ('sperm_approval_department', 'approval.department', '部门审批', 'approval', '审批能力', 'approval', '审批管理', '处理本部门审批。', 10, datetime('now'), datetime('now')),
  ('sperm_approval_cross_department', 'approval.cross_department', '跨部门审批', 'approval', '审批能力', 'approval', '审批管理', '处理跨部门审批。', 20, datetime('now'), datetime('now')),
  ('sperm_finance_review', 'finance.review', '财务复核', 'finance', '财务能力', 'finance', '财务管理', '进行财务复核。', 10, datetime('now'), datetime('now')),
  ('sperm_finance_cashier', 'finance.cashier', '出纳付款', 'finance', '财务能力', 'finance', '财务管理', '进行出纳付款处理。', 20, datetime('now'), datetime('now'));

INSERT OR IGNORE INTO system_roles (id, code, name, description, is_builtin, purpose_code, purpose_name, status, sort, created_at, updated_at)
VALUES
  ('srole_expense_manager', 'expense_manager', '报销规则管理员', '维护报销规则、审批模板并查看报表。', 1, 'business', '业务角色', 'active', 110, datetime('now'), datetime('now')),
  ('srole_finance_reviewer', 'finance_reviewer', '财务复核', '具备财务复核能力。', 1, 'business', '业务角色', 'active', 120, datetime('now'), datetime('now')),
  ('srole_finance_cashier', 'finance_cashier', '出纳', '具备付款出纳能力。', 1, 'business', '业务角色', 'active', 130, datetime('now'), datetime('now'));

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

DROP TABLE IF EXISTS user_finance_roles;
DROP TABLE IF EXISTS finance_roles;

CREATE TABLE IF NOT EXISTS approval_templates (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_approval_templates_status ON approval_templates(status);

CREATE TABLE IF NOT EXISTS approval_template_stages (
  id TEXT PRIMARY KEY,
  template_id TEXT NOT NULL,
  stage_code TEXT NOT NULL,
  stage_name TEXT NOT NULL,
  stage_type TEXT NOT NULL CHECK (stage_type IN ('direct_manager', 'department_manager', 'finance_review', 'cashier', 'special_authorizer')),
  resolver_type TEXT NOT NULL CHECK (resolver_type IN ('direct_manager', 'department_manager', 'department_chain', 'finance_approver', 'system_role')),
  resolver_ref TEXT,
  sort INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(template_id, stage_code),
  CHECK (
    (resolver_type = 'system_role' AND resolver_ref IS NOT NULL AND resolver_ref <> '')
    OR (resolver_type <> 'system_role' AND resolver_ref IS NULL)
  ),
  FOREIGN KEY (template_id) REFERENCES approval_templates(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_approval_template_stages_template ON approval_template_stages(template_id, sort);
