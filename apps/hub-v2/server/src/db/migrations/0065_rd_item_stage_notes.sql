CREATE TABLE IF NOT EXISTS rd_item_stage_notes (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  stage_id TEXT NOT NULL,
  stage_key TEXT NOT NULL,
  description TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(item_id, stage_id)
);

CREATE INDEX IF NOT EXISTS idx_rd_item_stage_notes_item
  ON rd_item_stage_notes(item_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_rd_item_stage_notes_project_stage
  ON rd_item_stage_notes(project_id, stage_id);
