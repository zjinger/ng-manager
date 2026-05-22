-- [0048] 组织职务字典与部门职务映射（organization_titles + department_titles）
-- Depends on: 0041_user_org
-- Notes: 用于用户组织职务、部门职务和报销申请人职务展示，不承载权限
CREATE TABLE IF NOT EXISTS organization_titles (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  sort INTEGER NOT NULL DEFAULT 0,
  remark TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_organization_titles_status ON organization_titles(status);
CREATE INDEX IF NOT EXISTS idx_organization_titles_sort ON organization_titles(sort, created_at);

INSERT OR IGNORE INTO organization_titles (id, code, name, status, sort, remark, created_at, updated_at) VALUES
  ('otitle_general_manager', 'general_manager', '总经理', 'active', 10, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('otitle_supervisor', 'supervisor', '主管', 'active', 20, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('otitle_frontend_engineer', 'frontend_engineer', '前端工程师', 'active', 30, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('otitle_backend_engineer', 'backend_engineer', '后台工程师', 'active', 40, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('otitle_android_engineer', 'android_engineer', '安卓工程师', 'active', 50, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('otitle_ui_designer', 'ui_designer', 'UI 设计师', 'active', 60, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('otitle_product_assistant', 'product_assistant', '产品助理', 'active', 70, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('otitle_product_manager', 'product_manager', '产品经理', 'active', 80, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('otitle_operation_supervisor', 'operation_supervisor', '运营主管', 'active', 90, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('otitle_operation_assistant', 'operation_assistant', '运营助理', 'active', 100, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('otitle_business', 'business', '商务', 'active', 110, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('otitle_accountant', 'accountant', '会计', 'active', 120, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('otitle_optics_supervisor', 'optics_supervisor', '光学主管', 'active', 130, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('otitle_optics_engineer', 'optics_engineer', '光学工程师', 'active', 140, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('otitle_hr', 'hr', '人事', 'active', 150, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('otitle_admin_specialist', 'admin_specialist', '行政专员', 'active', 160, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('otitle_ops_engineer', 'ops_engineer', '运维工程师', 'active', 170, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

ALTER TABLE users ADD COLUMN organization_title_code TEXT;

CREATE TABLE IF NOT EXISTS department_titles (
  id TEXT PRIMARY KEY,
  department_id TEXT NOT NULL,
  organization_title_code TEXT NOT NULL,
  sort INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(department_id, organization_title_code),
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
  FOREIGN KEY (organization_title_code) REFERENCES organization_titles(code) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_department_titles_department_sort
  ON department_titles(department_id, sort, created_at);

INSERT OR IGNORE INTO department_titles (
  id, department_id, organization_title_code, sort, created_at, updated_at
) VALUES
  ('dtitle_general_office_general_manager', 'dep_seed_general_office', 'general_manager', 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('dtitle_optics_rd_optics_supervisor', 'dep_seed_optics_rd', 'optics_supervisor', 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('dtitle_optics_rd_optics_engineer', 'dep_seed_optics_rd', 'optics_engineer', 20, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('dtitle_finance_legal_tax_accountant', 'dep_seed_finance_legal_tax', 'accountant', 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('dtitle_finance_legal_tax_business', 'dep_seed_finance_legal_tax', 'business', 20, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('dtitle_hr_admin_hr', 'dep_seed_hr_admin', 'hr', 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('dtitle_hr_admin_admin_specialist', 'dep_seed_hr_admin', 'admin_specialist', 20, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('dtitle_business_marketing_business', 'dep_seed_business_marketing', 'business', 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('dtitle_business_marketing_operation_supervisor', 'dep_seed_business_marketing', 'operation_supervisor', 20, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('dtitle_business_marketing_operation_assistant', 'dep_seed_business_marketing', 'operation_assistant', 30, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('dtitle_team_sl_ui_designer', 'dep_seed_team_sl', 'ui_designer', 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('dtitle_team_sl_product_manager', 'dep_seed_team_sl', 'product_manager', 20, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('dtitle_team_sl_product_assistant', 'dep_seed_team_sl', 'product_assistant', 30, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('dtitle_team_sl_ops_engineer', 'dep_seed_team_sl', 'ops_engineer', 40, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('dtitle_planning_mgmt_supervisor', 'dep_seed_planning_mgmt', 'supervisor', 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('dtitle_planning_mgmt_product_manager', 'dep_seed_planning_mgmt', 'product_manager', 20, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('dtitle_planning_mgmt_product_assistant', 'dep_seed_planning_mgmt', 'product_assistant', 30, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('dtitle_planning_mgmt_ui_designer', 'dep_seed_planning_mgmt', 'ui_designer', 40, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('dtitle_frontend_rd_1_supervisor', 'dep_seed_frontend_rd_1', 'supervisor', 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('dtitle_frontend_rd_1_frontend_engineer', 'dep_seed_frontend_rd_1', 'frontend_engineer', 20, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('dtitle_frontend_rd_2_supervisor', 'dep_seed_frontend_rd_2', 'supervisor', 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('dtitle_frontend_rd_2_frontend_engineer', 'dep_seed_frontend_rd_2', 'frontend_engineer', 20, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('dtitle_backend_rd_supervisor', 'dep_seed_backend_rd', 'supervisor', 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('dtitle_backend_rd_backend_engineer', 'dep_seed_backend_rd', 'backend_engineer', 20, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('dtitle_mobile_rd_android_engineer', 'dep_seed_mobile_rd', 'android_engineer', 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
