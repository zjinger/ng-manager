-- project members
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

CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON project_members(user_id);

CREATE TABLE IF NOT EXISTS project_member_roles (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL,
  role TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (member_id) REFERENCES project_members(id) ON DELETE CASCADE,
  UNIQUE(member_id, role)
);

CREATE INDEX IF NOT EXISTS idx_project_member_roles_member_id ON project_member_roles(member_id);
CREATE INDEX IF NOT EXISTS idx_project_member_roles_role ON project_member_roles(role);

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
