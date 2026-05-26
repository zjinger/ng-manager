CREATE TABLE IF NOT EXISTS rd_member_blocks (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_name TEXT,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  blocked_at TEXT NOT NULL,
  resolved_at TEXT,
  resolved_by_id TEXT,
  resolved_by_name TEXT,
  resolve_note TEXT,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES rd_items(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_rd_member_blocks_active_user
  ON rd_member_blocks(item_id, user_id)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_rd_member_blocks_item_status
  ON rd_member_blocks(item_id, status, blocked_at DESC);

