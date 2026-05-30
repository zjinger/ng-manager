CREATE TABLE IF NOT EXISTS rd_stage_task_owners (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  progress INTEGER NOT NULL DEFAULT 0,
  started_at TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (task_id) REFERENCES rd_stage_tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES rd_items(id) ON DELETE CASCADE,
  UNIQUE(task_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_rd_stage_task_owners_task
  ON rd_stage_task_owners(task_id);

CREATE INDEX IF NOT EXISTS idx_rd_stage_task_owners_user
  ON rd_stage_task_owners(user_id, task_id);

CREATE INDEX IF NOT EXISTS idx_rd_stage_task_owners_item_user_status
  ON rd_stage_task_owners(item_id, user_id, status);
