CREATE TABLE IF NOT EXISTS department_titles (
  id TEXT PRIMARY KEY,
  department_id TEXT NOT NULL,
  title_code TEXT NOT NULL,
  sort INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(department_id, title_code),
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
  FOREIGN KEY (title_code) REFERENCES system_titles(code) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_department_titles_department_sort
  ON department_titles(department_id, sort, created_at);

