-- [0055] 研发管理任务单
-- Depends on: uploads, projects, users, 0042_system_rbac
CREATE TABLE IF NOT EXISTS rd_task_sheets (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  sheet_no TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'returned', 'issued', 'processing', 'replied', 'closed')),
  title TEXT NOT NULL,
  issue_date TEXT NOT NULL,
  issuer_department TEXT,
  issuer_user_id TEXT,
  issuer_name TEXT NOT NULL,
  receiver_department TEXT,
  receiver_user_id TEXT,
  receiver_name TEXT,
  receiver_phone TEXT,
  processor_user_id TEXT,
  processor_name TEXT,
  customer_company TEXT,
  customer_contact TEXT,
  customer_phone TEXT,
  project_name TEXT,
  project_contact TEXT,
  related_system TEXT,
  urgency TEXT NOT NULL DEFAULT 'normal' CHECK (urgency IN ('normal', 'urgent')),
  business_type TEXT NOT NULL DEFAULT 'technical_service' CHECK (business_type IN ('development', 'after_sales', 'consulting', 'technical_service', 'other')),
  expected_resolved_at TEXT,
  resolved_at TEXT,
  result TEXT CHECK (result IN ('resolved', 'unresolved')),
  business_description TEXT NOT NULL,
  delivery_content TEXT,
  close_reason TEXT,
  converted_rd_item_id TEXT,
  converted_issue_id TEXT,
  creator_id TEXT NOT NULL,
  creator_name TEXT NOT NULL,
  prepared_by_name TEXT,
  reviewer_user_id TEXT,
  reviewer_name TEXT,
  reviewed_at TEXT,
  review_comment TEXT,
  assigned_at TEXT,
  assignment_comment TEXT,
  issued_at TEXT,
  processing_started_at TEXT,
  replied_at TEXT,
  closed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
  FOREIGN KEY (issuer_user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (receiver_user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (processor_user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (reviewer_user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (converted_rd_item_id) REFERENCES rd_items(id) ON DELETE SET NULL,
  FOREIGN KEY (converted_issue_id) REFERENCES issues(id) ON DELETE SET NULL,
  FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_rd_task_sheets_project ON rd_task_sheets(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rd_task_sheets_status ON rd_task_sheets(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rd_task_sheets_creator ON rd_task_sheets(creator_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rd_task_sheets_issuer ON rd_task_sheets(issuer_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rd_task_sheets_receiver ON rd_task_sheets(receiver_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rd_task_sheets_processor ON rd_task_sheets(processor_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rd_task_sheets_reviewer ON rd_task_sheets(reviewer_user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS rd_task_sheet_attachments (
  id TEXT PRIMARY KEY,
  sheet_id TEXT NOT NULL,
  upload_id TEXT NOT NULL,
  created_by_user_id TEXT,
  created_at TEXT NOT NULL,
  UNIQUE(sheet_id, upload_id),
  FOREIGN KEY (sheet_id) REFERENCES rd_task_sheets(id) ON DELETE CASCADE,
  FOREIGN KEY (upload_id) REFERENCES uploads(id) ON DELETE RESTRICT,
  FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_rd_task_sheet_attachments_sheet ON rd_task_sheet_attachments(sheet_id, created_at);
CREATE INDEX IF NOT EXISTS idx_rd_task_sheet_attachments_upload ON rd_task_sheet_attachments(upload_id);

CREATE TABLE IF NOT EXISTS rd_task_sheet_logs (
  id TEXT PRIMARY KEY,
  sheet_id TEXT NOT NULL,
  action TEXT NOT NULL,
  actor_user_id TEXT,
  actor_name TEXT,
  comment TEXT,
  meta_json TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (sheet_id) REFERENCES rd_task_sheets(id) ON DELETE CASCADE,
  FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_rd_task_sheet_logs_sheet ON rd_task_sheet_logs(sheet_id, created_at);

CREATE TABLE IF NOT EXISTS rd_task_sheet_default_routes (
  id TEXT PRIMARY KEY,
  issuer_user_id TEXT,
  issuer_name TEXT,
  issuer_department TEXT,
  receiver_user_id TEXT,
  receiver_name TEXT,
  receiver_department TEXT,
  receiver_phone TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  remark TEXT,
  sort INTEGER NOT NULL DEFAULT 0,
  created_by_user_id TEXT,
  updated_by_user_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (issuer_user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (receiver_user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (updated_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_rd_task_sheet_default_routes_issuer ON rd_task_sheet_default_routes(issuer_user_id, status, sort);
CREATE INDEX IF NOT EXISTS idx_rd_task_sheet_default_routes_status ON rd_task_sheet_default_routes(status, sort);

INSERT OR IGNORE INTO system_permissions (
  id, code, name, group_code, group_name, domain_code, domain_name, description, sort, created_at, updated_at
)
VALUES
  ('sperm_task_sheet_submit', 'task_sheet.submit', '提交任务单', 'task_sheet', '任务单', 'rd', '研发管理', '创建并下发任务单。', 10, datetime('now'), datetime('now')),
  ('sperm_task_sheet_view_self', 'task_sheet.view.self', '查看本人任务单', 'task_sheet', '任务单', 'rd', '研发管理', '查看与本人相关的任务单。', 20, datetime('now'), datetime('now')),
  ('sperm_task_sheet_manage', 'task_sheet.manage', '管理任务单', 'task_sheet', '任务单', 'rd', '研发管理', '管理和处理全部任务单。', 30, datetime('now'), datetime('now'));

INSERT OR IGNORE INTO system_role_permissions (role_id, permission_id, created_at)
SELECT 'srole_super_admin', id, datetime('now')
FROM system_permissions
WHERE code IN ('task_sheet.submit', 'task_sheet.view.self', 'task_sheet.manage');

INSERT OR IGNORE INTO system_role_permissions (role_id, permission_id, created_at)
SELECT 'srole_member', id, datetime('now')
FROM system_permissions
WHERE code IN ('task_sheet.submit', 'task_sheet.view.self');
