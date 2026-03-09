ALTER TABLE announcements ADD COLUMN project_id TEXT;

CREATE INDEX IF NOT EXISTS idx_announcements_project_id ON announcements(project_id);
CREATE INDEX IF NOT EXISTS idx_announcements_status_project_id ON announcements(status, project_id);