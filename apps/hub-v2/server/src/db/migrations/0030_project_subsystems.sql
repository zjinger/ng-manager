ALTER TABLE project_modules ADD COLUMN parent_id TEXT REFERENCES project_modules(id) ON DELETE SET NULL;
ALTER TABLE project_modules ADD COLUMN node_type TEXT NOT NULL DEFAULT 'module' CHECK (node_type IN ('subsystem', 'module'));

CREATE INDEX IF NOT EXISTS idx_project_modules_parent_id
  ON project_modules(parent_id);
