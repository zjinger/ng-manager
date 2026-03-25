ALTER TABLE projects ADD COLUMN display_code TEXT;
ALTER TABLE projects ADD COLUMN avatar_upload_id TEXT;

CREATE INDEX IF NOT EXISTS idx_projects_display_code ON projects(display_code);
CREATE INDEX IF NOT EXISTS idx_projects_avatar_upload_id ON projects(avatar_upload_id);
