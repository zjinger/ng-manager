CREATE TABLE IF NOT EXISTS departments (
  id TEXT PRIMARY KEY,
  parent_id TEXT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  external_finance_code TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  sort INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (parent_id) REFERENCES departments(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_departments_parent_id ON departments(parent_id);
CREATE INDEX IF NOT EXISTS idx_departments_status ON departments(status);
CREATE INDEX IF NOT EXISTS idx_departments_sort ON departments(sort, name);
CREATE INDEX IF NOT EXISTS idx_departments_external_finance_code ON departments(external_finance_code);

CREATE TABLE IF NOT EXISTS user_departments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  department_id TEXT NOT NULL,
  relation_type TEXT NOT NULL DEFAULT 'secondary' CHECK (relation_type IN ('primary', 'secondary')),
  role_code TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(user_id, department_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_departments_primary
  ON user_departments(user_id)
  WHERE relation_type = 'primary';
CREATE INDEX IF NOT EXISTS idx_user_departments_user_id ON user_departments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_departments_department_id ON user_departments(department_id);

CREATE TABLE IF NOT EXISTS finance_roles (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  sort INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_finance_roles_status ON finance_roles(status);
CREATE INDEX IF NOT EXISTS idx_finance_roles_sort ON finance_roles(sort, name);

CREATE TABLE IF NOT EXISTS user_finance_roles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  role_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(user_id, role_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES finance_roles(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_finance_roles_user_id ON user_finance_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_finance_roles_role_id ON user_finance_roles(role_id);
