ALTER TABLE feedbacks ADD COLUMN project_key TEXT;

CREATE INDEX IF NOT EXISTS idx_feedbacks_project_key ON feedbacks(project_key);
CREATE INDEX IF NOT EXISTS idx_feedbacks_project_key_status ON feedbacks(project_key, status);