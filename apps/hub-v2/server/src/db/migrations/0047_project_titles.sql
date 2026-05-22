-- [0047] 项目角色/项目分工字典（project_titles）
-- Depends on: none
-- Notes: 用于项目成员角色候选和项目分工展示，不表示用户组织职务
CREATE TABLE IF NOT EXISTS project_titles (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  sort INTEGER NOT NULL DEFAULT 0,
  remark TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_project_titles_status ON project_titles(status);
CREATE INDEX IF NOT EXISTS idx_project_titles_sort ON project_titles(sort, created_at);

ALTER TABLE users ADD COLUMN default_project_title_code TEXT;

CREATE INDEX IF NOT EXISTS idx_users_default_project_title_code ON users(default_project_title_code);

INSERT OR IGNORE INTO project_titles (id, code, name, status, sort, remark, created_at, updated_at) VALUES
  ('ptitle_member', 'member', '成员', 'active', 10, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('ptitle_product', 'product', '产品', 'active', 20, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('ptitle_ui', 'ui', 'UI', 'active', 30, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('ptitle_frontend_dev', 'frontend_dev', '前端开发', 'active', 40, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('ptitle_backend_dev', 'backend_dev', '后端开发', 'active', 50, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('ptitle_qa', 'qa', '测试', 'active', 60, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('ptitle_ops', 'ops', '运维', 'active', 70, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('ptitle_project_admin', 'project_admin', '项目管理员', 'active', 80, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
