-- [0071] Company-wide Skill Hub registry

CREATE TABLE IF NOT EXISTS skills (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  description_md TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'general',
  tags_json TEXT NOT NULL DEFAULT '[]',
  owner_user_id TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  latest_version_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_skills_status_updated ON skills(status, updated_at);
CREATE INDEX IF NOT EXISTS idx_skills_owner_status ON skills(owner_user_id, status);
CREATE INDEX IF NOT EXISTS idx_skills_category_status ON skills(category, status);

CREATE TABLE IF NOT EXISTS skill_versions (
  id TEXT PRIMARY KEY,
  skill_id TEXT NOT NULL,
  version TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'published', 'rejected', 'archived')),
  manifest_json TEXT NOT NULL DEFAULT '{}',
  readme_md TEXT NOT NULL DEFAULT '',
  package_upload_id TEXT NOT NULL,
  checksum TEXT,
  file_count INTEGER NOT NULL DEFAULT 0,
  package_size INTEGER NOT NULL DEFAULT 0,
  submitted_by_user_id TEXT,
  reviewed_by_user_id TEXT,
  review_comment TEXT,
  published_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (skill_id, version),
  FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE,
  FOREIGN KEY (package_upload_id) REFERENCES uploads(id) ON DELETE RESTRICT,
  FOREIGN KEY (submitted_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (reviewed_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_skill_versions_skill_status ON skill_versions(skill_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_skill_versions_upload ON skill_versions(package_upload_id);

CREATE TABLE IF NOT EXISTS skill_comments (
  id TEXT PRIMARY KEY,
  skill_id TEXT NOT NULL,
  author_id TEXT,
  author_name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE,
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_skill_comments_skill_created ON skill_comments(skill_id, created_at);

INSERT OR IGNORE INTO system_permissions (
  id, code, name, group_code, group_name, domain_code, domain_name, description, sort, created_at, updated_at
)
VALUES
  ('sperm_skill_view', 'skill.view', '查看 Skill Hub', 'skill', 'Skill Hub', 'content', '内容中心', '浏览和下载已发布 skill。', 80, datetime('now'), datetime('now')),
  ('sperm_skill_create', 'skill.create', '上传 Skill 草稿', 'skill', 'Skill Hub', 'content', '内容中心', '创建和提交自己的 skill 草稿版本。', 90, datetime('now'), datetime('now')),
  ('sperm_skill_review', 'skill.review', '审核 Skill', 'skill', 'Skill Hub', 'content', '内容中心', '发布或拒绝 skill 版本。', 100, datetime('now'), datetime('now')),
  ('sperm_skill_manage', 'skill.manage', '管理 Skill Hub', 'skill', 'Skill Hub', 'content', '内容中心', '归档和治理 Skill Hub 数据。', 110, datetime('now'), datetime('now'));

INSERT OR IGNORE INTO system_role_permissions (role_id, permission_id, created_at)
SELECT 'srole_super_admin', id, datetime('now')
FROM system_permissions
WHERE code IN ('skill.view', 'skill.create', 'skill.review', 'skill.manage');

INSERT OR IGNORE INTO system_role_permissions (role_id, permission_id, created_at)
SELECT 'srole_member', id, datetime('now')
FROM system_permissions
WHERE code IN ('skill.view', 'skill.create');

INSERT OR IGNORE INTO system_role_permissions (role_id, permission_id, created_at)
SELECT 'srole_admin', id, datetime('now')
FROM system_permissions
WHERE code IN ('skill.view', 'skill.create', 'skill.review');
