CREATE TABLE IF NOT EXISTS announcement_reads (
  id TEXT PRIMARY KEY,
  announcement_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  read_version TEXT NOT NULL,
  read_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_announcement_reads_announcement_user
  ON announcement_reads(announcement_id, user_id);

CREATE INDEX IF NOT EXISTS idx_announcement_reads_user_id
  ON announcement_reads(user_id);

CREATE INDEX IF NOT EXISTS idx_announcement_reads_read_at
  ON announcement_reads(read_at DESC);
