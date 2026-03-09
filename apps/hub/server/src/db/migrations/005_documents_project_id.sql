ALTER TABLE documents ADD COLUMN project_id TEXT;

CREATE INDEX IF NOT EXISTS idx_documents_project_id ON documents(project_id);
CREATE INDEX IF NOT EXISTS idx_documents_status_project_id ON documents(status, project_id);