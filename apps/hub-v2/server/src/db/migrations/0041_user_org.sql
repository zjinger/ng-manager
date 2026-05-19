-- [0041] 组织基础模型（部门 + 用户单主部门关系）
-- Depends on: users
-- Notes: 每个用户仅一个主部门归属
CREATE TABLE IF NOT EXISTS departments (
  id TEXT PRIMARY KEY,
  parent_id TEXT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  external_finance_code TEXT,
  manager_user_id TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  sort INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (parent_id) REFERENCES departments(id) ON DELETE SET NULL,
  FOREIGN KEY (manager_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_departments_parent_id ON departments(parent_id);
CREATE INDEX IF NOT EXISTS idx_departments_status ON departments(status);
CREATE INDEX IF NOT EXISTS idx_departments_sort ON departments(sort, name);
CREATE INDEX IF NOT EXISTS idx_departments_external_finance_code ON departments(external_finance_code);
CREATE INDEX IF NOT EXISTS idx_departments_manager_user_id ON departments(manager_user_id);

CREATE TABLE IF NOT EXISTS user_departments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  department_id TEXT NOT NULL,
  role_code TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(user_id, department_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_departments_user_id ON user_departments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_departments_department_id ON user_departments(department_id);

-- 默认组织架构初始化（可重复执行）
INSERT OR IGNORE INTO departments (
  id, parent_id, code, name, description, external_finance_code, manager_user_id, status, sort, created_at, updated_at
)
VALUES
  ('dep_seed_company_sl', NULL, 'company_sl', '深蓝信息', NULL, NULL, NULL, 'active', 10, datetime('now'), datetime('now')),
  ('dep_seed_optics_rd', 'dep_seed_company_sl', 'optics_rd', '光学研发部', NULL, NULL, NULL, 'active', 20, datetime('now'), datetime('now')),
  ('dep_seed_software_rd', 'dep_seed_company_sl', 'software_rd', '软件研发部', NULL, NULL, NULL, 'active', 30, datetime('now'), datetime('now')),
  ('dep_seed_finance_legal_tax', 'dep_seed_company_sl', 'finance_legal_tax', '财务法税部', NULL, NULL, NULL, 'active', 40, datetime('now'), datetime('now')),
  ('dep_seed_hr_admin', 'dep_seed_company_sl', 'hr_admin', '人事行政部', NULL, NULL, NULL, 'active', 50, datetime('now'), datetime('now')),
  ('dep_seed_business_marketing', 'dep_seed_company_sl', 'business_marketing', '商务营销部', NULL, NULL, NULL, 'active', 60, datetime('now'), datetime('now')),
  ('dep_seed_team_sl', 'dep_seed_company_sl', 'team_sl', '深蓝天津', NULL, NULL, NULL, 'active', 70, datetime('now'), datetime('now')),
  ('dep_seed_mobile_rd', 'dep_seed_software_rd', 'mobile_rd', '移动研发部', NULL, NULL, NULL, 'active', 10, datetime('now'), datetime('now')),
  ('dep_seed_planning_mgmt', 'dep_seed_software_rd', 'planning_mgmt', '策划管理部', NULL, NULL, NULL, 'active', 20, datetime('now'), datetime('now')),
  ('dep_seed_frontend_rd_1', 'dep_seed_software_rd', 'frontend_rd_1', '前端研发一部', NULL, NULL, NULL, 'active', 30, datetime('now'), datetime('now')),
  ('dep_seed_frontend_rd_2', 'dep_seed_software_rd', 'frontend_rd_2', '前端研发二部', NULL, NULL, NULL, 'active', 40, datetime('now'), datetime('now')),
  ('dep_seed_backend_rd', 'dep_seed_software_rd', 'backend_rd', '后台研发部', NULL, NULL, NULL, 'active', 50, datetime('now'), datetime('now'));
