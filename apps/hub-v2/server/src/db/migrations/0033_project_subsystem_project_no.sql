ALTER TABLE project_modules ADD COLUMN project_no TEXT;

CREATE INDEX IF NOT EXISTS idx_project_modules_project_no
  ON project_modules(project_id, project_no);
