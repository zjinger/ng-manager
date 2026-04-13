ALTER TABLE projects ADD COLUMN project_no TEXT;

UPDATE projects
SET project_no = UPPER(REPLACE(project_key, 'prj_', 'PN-'))
WHERE project_no IS NULL OR TRIM(project_no) = '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_project_no ON projects(project_no COLLATE NOCASE);

CREATE TRIGGER IF NOT EXISTS trg_projects_project_no_required_insert
BEFORE INSERT ON projects
FOR EACH ROW
WHEN NEW.project_no IS NULL OR TRIM(NEW.project_no) = ''
BEGIN
  SELECT RAISE(ABORT, 'project_no is required');
END;

CREATE TRIGGER IF NOT EXISTS trg_projects_project_no_required_update
BEFORE UPDATE OF project_no ON projects
FOR EACH ROW
WHEN NEW.project_no IS NULL OR TRIM(NEW.project_no) = ''
BEGIN
  SELECT RAISE(ABORT, 'project_no is required');
END;
