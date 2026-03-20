CREATE TABLE IF NOT EXISTS uploads (
  id TEXT PRIMARY KEY,
  bucket TEXT NOT NULL DEFAULT 'default',
  category TEXT NOT NULL DEFAULT 'general',
  file_name TEXT NOT NULL,
  original_name TEXT NOT NULL,
  file_ext TEXT,
  mime_type TEXT,
  file_size INTEGER NOT NULL DEFAULT 0,
  checksum TEXT,
  storage_provider TEXT NOT NULL DEFAULT 'local',
  storage_path TEXT NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'public')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  uploader_id TEXT,
  uploader_name TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_uploads_category ON uploads(category);
CREATE INDEX IF NOT EXISTS idx_uploads_uploader_id ON uploads(uploader_id);
CREATE INDEX IF NOT EXISTS idx_uploads_status ON uploads(status);
CREATE INDEX IF NOT EXISTS idx_uploads_checksum ON uploads(checksum);
