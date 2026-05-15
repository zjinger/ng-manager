-- 收口 user_departments：移除 secondary 兼容语义，仅保留单主部门归属
DELETE FROM user_departments
WHERE relation_type IS NOT NULL AND relation_type <> 'primary';

CREATE TABLE IF NOT EXISTS user_departments_v2 (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  department_id TEXT NOT NULL,
  role_code TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(user_id, department_id),
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY(department_id) REFERENCES departments(id) ON DELETE CASCADE
);

INSERT INTO user_departments_v2 (
  id, user_id, department_id, role_code, created_at, updated_at
)
SELECT
  ud.id,
  ud.user_id,
  ud.department_id,
  ud.role_code,
  ud.created_at,
  ud.updated_at
FROM user_departments ud
INNER JOIN (
  SELECT user_id, MAX(rowid) AS keep_rowid
  FROM user_departments
  GROUP BY user_id
) latest ON latest.user_id = ud.user_id AND latest.keep_rowid = ud.rowid;

DROP TABLE user_departments;
ALTER TABLE user_departments_v2 RENAME TO user_departments;

CREATE INDEX IF NOT EXISTS idx_user_departments_user_id ON user_departments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_departments_department_id ON user_departments(department_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_departments_primary ON user_departments(user_id);
