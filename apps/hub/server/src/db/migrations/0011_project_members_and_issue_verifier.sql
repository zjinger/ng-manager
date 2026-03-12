-- 1) users
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  display_name TEXT,
  email TEXT,
  mobile TEXT,
  title_code TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  source TEXT NOT NULL DEFAULT 'local' CHECK (source IN ('local', 'imported')),
  remark TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_display_name ON users(display_name);

-- Optional bootstrap from existing admin users
-- INSERT INTO users (id, username, display_name, status, source, created_at, updated_at)
-- SELECT
--   au.id,
--   au.username,
--   COALESCE(NULLIF(TRIM(au.nickname), ''), au.username) AS display_name,
--   CASE WHEN au.status = 'active' THEN 'active' ELSE 'inactive' END AS status,
--   'local' AS source,
--   au.created_at,
--   au.updated_at
-- FROM admin_users au
-- WHERE NOT EXISTS (
--   SELECT 1 FROM users u WHERE u.id = au.id
-- );

-- 2) project members
CREATE TABLE IF NOT EXISTS project_members (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  display_name TEXT,
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  joined_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  UNIQUE(project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_project_members_project_id
ON project_members(project_id);

CREATE INDEX IF NOT EXISTS idx_project_members_user_id
ON project_members(user_id);

CREATE TABLE IF NOT EXISTS project_member_roles (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL,
  role TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (member_id) REFERENCES project_members(id) ON DELETE CASCADE,
  UNIQUE(member_id, role)
);

CREATE INDEX IF NOT EXISTS idx_project_member_roles_member_id
ON project_member_roles(member_id);

CREATE INDEX IF NOT EXISTS idx_project_member_roles_role
ON project_member_roles(role);

CREATE TRIGGER IF NOT EXISTS trg_project_member_roles_role_check_insert
BEFORE INSERT ON project_member_roles
FOR EACH ROW
BEGIN
  SELECT CASE
    WHEN NEW.role NOT IN ('product', 'ui', 'frontend_dev', 'backend_dev', 'qa', 'ops')
    THEN RAISE(ABORT, 'PROJECT_MEMBER_ROLE_INVALID')
  END;
END;

CREATE TRIGGER IF NOT EXISTS trg_project_member_roles_role_check_update
BEFORE UPDATE OF role ON project_member_roles
FOR EACH ROW
BEGIN
  SELECT CASE
    WHEN NEW.role NOT IN ('product', 'ui', 'frontend_dev', 'backend_dev', 'qa', 'ops')
    THEN RAISE(ABORT, 'PROJECT_MEMBER_ROLE_INVALID')
  END;
END;

-- 3) issue workflow extension
ALTER TABLE issues ADD COLUMN verifier_id TEXT;
ALTER TABLE issues ADD COLUMN verifier_name TEXT;
ALTER TABLE issues ADD COLUMN last_verified_result TEXT CHECK (
  last_verified_result IN ('pass', 'fail') OR last_verified_result IS NULL
);

CREATE INDEX IF NOT EXISTS idx_issues_verifier_id ON issues(verifier_id);
CREATE INDEX IF NOT EXISTS idx_issues_last_verified_result ON issues(last_verified_result);


