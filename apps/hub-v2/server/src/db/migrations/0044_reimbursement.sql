-- [0044] 报销业务基础表（单据、明细、附件、审批任务、日志）
-- Depends on: users, uploads, departments, approval_templates, approval_template_stages
-- Notes: 与 0043 配套；支持“审批任务可转交”口径
CREATE TABLE IF NOT EXISTS reimbursement_claims (
  id TEXT PRIMARY KEY,
  claim_no TEXT NOT NULL UNIQUE,
  claim_type TEXT NOT NULL CHECK (claim_type IN ('travel', 'general')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approving', 'rejected', 'completed', 'cancelled')),
  applicant_user_id TEXT NOT NULL,
  applicant_name TEXT NOT NULL,
  department_id TEXT NOT NULL,
  department_name TEXT NOT NULL,
  reason TEXT NOT NULL,
  fill_date TEXT NOT NULL,
  travel_start_date TEXT,
  travel_start_half TEXT CHECK (travel_start_half IN ('am', 'pm')),
  travel_end_date TEXT,
  travel_end_half TEXT CHECK (travel_end_half IN ('am', 'pm')),
  travel_days REAL,
  receipt_count INTEGER,
  total_amount_cents INTEGER NOT NULL DEFAULT 0,
  advance_amount_cents INTEGER NOT NULL DEFAULT 0,
  balance_amount_cents INTEGER NOT NULL DEFAULT 0,
  current_stage_code TEXT,
  current_stage_name TEXT,
  submitted_at TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (applicant_user_id) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_reimbursement_claims_applicant ON reimbursement_claims(applicant_user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_reimbursement_claims_department ON reimbursement_claims(department_id, created_at);
CREATE INDEX IF NOT EXISTS idx_reimbursement_claims_status ON reimbursement_claims(status, created_at);
CREATE INDEX IF NOT EXISTS idx_reimbursement_claims_type ON reimbursement_claims(claim_type, created_at);

CREATE TABLE IF NOT EXISTS reimbursement_items (
  id TEXT PRIMARY KEY,
  claim_id TEXT NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('travel', 'general')),
  category TEXT,
  description TEXT,
  occurred_date TEXT,
  start_date TEXT,
  end_date TEXT,
  from_location TEXT,
  to_location TEXT,
  amount_cents INTEGER NOT NULL DEFAULT 0,
  meta_json TEXT,
  sort INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (claim_id) REFERENCES reimbursement_claims(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_reimbursement_items_claim ON reimbursement_items(claim_id, sort);

CREATE TABLE IF NOT EXISTS reimbursement_attachments (
  id TEXT PRIMARY KEY,
  claim_id TEXT NOT NULL,
  upload_id TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('invoice', 'itinerary', 'payment_proof', 'other')),
  created_by_user_id TEXT,
  created_at TEXT NOT NULL,
  UNIQUE(claim_id, upload_id),
  FOREIGN KEY (claim_id) REFERENCES reimbursement_claims(id) ON DELETE CASCADE,
  FOREIGN KEY (upload_id) REFERENCES uploads(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_reimbursement_attachments_claim ON reimbursement_attachments(claim_id);
CREATE INDEX IF NOT EXISTS idx_reimbursement_attachments_upload ON reimbursement_attachments(upload_id);

CREATE TABLE IF NOT EXISTS reimbursement_approval_tasks (
  id TEXT PRIMARY KEY,
  claim_id TEXT NOT NULL,
  template_id TEXT NOT NULL,
  template_stage_id TEXT,
  stage_code TEXT NOT NULL,
  stage_name TEXT NOT NULL,
  stage_type TEXT NOT NULL,
  resolver_type TEXT NOT NULL,
  resolver_ref TEXT,
  assignee_user_id TEXT NOT NULL,
  assignee_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'cancelled' CHECK (status IN ('pending', 'approved', 'rejected', 'transferred', 'addsign_pending', 'cancelled')),
  sort INTEGER NOT NULL DEFAULT 0,
  parent_task_id TEXT,
  transferred_from_task_id TEXT,
  comment TEXT,
  acted_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (claim_id) REFERENCES reimbursement_claims(id) ON DELETE CASCADE,
  FOREIGN KEY (template_id) REFERENCES approval_templates(id) ON DELETE RESTRICT,
  FOREIGN KEY (template_stage_id) REFERENCES approval_template_stages(id) ON DELETE SET NULL,
  FOREIGN KEY (assignee_user_id) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (parent_task_id) REFERENCES reimbursement_approval_tasks(id) ON DELETE SET NULL,
  FOREIGN KEY (transferred_from_task_id) REFERENCES reimbursement_approval_tasks(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_reimbursement_tasks_claim ON reimbursement_approval_tasks(claim_id, sort, created_at);
CREATE INDEX IF NOT EXISTS idx_reimbursement_tasks_assignee_status ON reimbursement_approval_tasks(assignee_user_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_reimbursement_tasks_parent ON reimbursement_approval_tasks(parent_task_id);

CREATE TABLE IF NOT EXISTS reimbursement_logs (
  id TEXT PRIMARY KEY,
  claim_id TEXT NOT NULL,
  actor_user_id TEXT,
  actor_name TEXT,
  action TEXT NOT NULL,
  task_id TEXT,
  comment TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (claim_id) REFERENCES reimbursement_claims(id) ON DELETE CASCADE,
  FOREIGN KEY (task_id) REFERENCES reimbursement_approval_tasks(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_reimbursement_logs_claim ON reimbursement_logs(claim_id, created_at);
