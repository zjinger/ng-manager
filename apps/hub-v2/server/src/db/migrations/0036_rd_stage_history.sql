CREATE TABLE IF NOT EXISTS rd_stage_history (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  from_stage_id TEXT,
  from_stage_name TEXT NOT NULL,
  to_stage_id TEXT NOT NULL,
  to_stage_name TEXT NOT NULL,
  snapshot_json TEXT NOT NULL,
  operator_id TEXT,
  operator_name TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES rd_items(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_rd_stage_history_item_id
  ON rd_stage_history(item_id, created_at DESC);
