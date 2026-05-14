CREATE TABLE IF NOT EXISTS departments (
  id TEXT PRIMARY KEY,
  parent_id TEXT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  external_finance_code TEXT,
  manager_user_id TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  sort INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (parent_id) REFERENCES departments(id) ON DELETE SET NULL,
  FOREIGN KEY (manager_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_departments_parent_id ON departments(parent_id);
CREATE INDEX IF NOT EXISTS idx_departments_status ON departments(status);
CREATE INDEX IF NOT EXISTS idx_departments_sort ON departments(sort, name);
CREATE INDEX IF NOT EXISTS idx_departments_external_finance_code ON departments(external_finance_code);
CREATE INDEX IF NOT EXISTS idx_departments_manager_user_id ON departments(manager_user_id);

CREATE TABLE IF NOT EXISTS user_departments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  department_id TEXT NOT NULL,
  relation_type TEXT NOT NULL DEFAULT 'primary' CHECK (relation_type = 'primary'),
  role_code TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(user_id, department_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_departments_user_id ON user_departments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_departments_department_id ON user_departments(department_id);
