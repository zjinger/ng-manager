CREATE TABLE IF NOT EXISTS rd_stage_tasks (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  stage_key TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  owner_id TEXT,
  owner_name TEXT,
  progress INTEGER NOT NULL DEFAULT 0,
  planned_start_at TEXT,
  planned_end_at TEXT,
  started_at TEXT,
  completed_at TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  remark TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES rd_items(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_rd_stage_tasks_item_stage
  ON rd_stage_tasks(item_id, stage_key, sort_order ASC);

CREATE INDEX IF NOT EXISTS idx_rd_stage_tasks_owner
  ON rd_stage_tasks(owner_id, status);
