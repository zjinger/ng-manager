-- [0043] 审批模板主数据（固定阶段模板）
-- Depends on: 0042_system_rbac
-- Notes: 仅配置模板与阶段，不落审批实例执行数据
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
  resolver_type TEXT NOT NULL CHECK (resolver_type IN ('direct_manager', 'department_manager', 'department_chain', 'system_role')),
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

INSERT OR IGNORE INTO approval_templates (
  id, code, name, description, status, created_at, updated_at
)
VALUES (
  'tpl_expense_default',
  'expense_default',
  '默认报销审批',
  '系统默认报销审批模板。',
  'active',
  datetime('now'),
  datetime('now')
);

INSERT OR IGNORE INTO approval_template_stages (
  id, template_id, stage_code, stage_name, stage_type, resolver_type, resolver_ref, sort, created_at, updated_at
)
VALUES
  (
    'stg_expense_direct_manager',
    'tpl_expense_default',
    'review',
    '审核',
    'special_authorizer',
    'system_role',
    'srole_expense_manager',
    10,
    datetime('now'),
    datetime('now')
  ),
  (
    'stg_expense_department_manager',
    'tpl_expense_default',
    'department_manager',
    '部门主管',
    'department_manager',
    'department_manager',
    NULL,
    20,
    datetime('now'),
    datetime('now')
  ),
  (
    'stg_expense_finance_review',
    'tpl_expense_default',
    'finance_review',
    '会计',
    'finance_review',
    'system_role',
    'srole_finance',
    30,
    datetime('now'),
    datetime('now')
  ),
  (
    'stg_expense_cashier',
    'tpl_expense_default',
    'cashier',
    '出纳',
    'cashier',
    'system_role',
    'srole_finance',
    40,
    datetime('now'),
    datetime('now')
  );
