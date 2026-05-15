CREATE TABLE IF NOT EXISTS system_titles (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  sort INTEGER NOT NULL DEFAULT 0,
  remark TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_system_titles_status ON system_titles(status);
CREATE INDEX IF NOT EXISTS idx_system_titles_sort ON system_titles(sort, created_at);

INSERT OR IGNORE INTO system_titles (id, code, name, status, sort, remark, created_at, updated_at) VALUES
  ('title_product', 'product', '产品', 'active', 10, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('title_ui', 'ui', 'UI', 'active', 20, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('title_frontend_dev', 'frontend_dev', '前端开发', 'active', 30, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('title_backend_dev', 'backend_dev', '后端开发', 'active', 40, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('title_mobile_dev', 'mobile_dev', '移动端开发', 'active', 50, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('title_qa', 'qa', '测试', 'active', 60, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('title_operation', 'operation', '运营', 'active', 70, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('title_business', 'business', '商务', 'active', 80, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('title_hr', 'hr', '人事', 'active', 90, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('title_finance', 'finance', '财务', 'active', 100, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('title_admin', 'admin', '行政', 'active', 110, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('title_ops', 'ops', '运维', 'active', 120, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('title_other', 'other', '其他', 'active', 130, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
