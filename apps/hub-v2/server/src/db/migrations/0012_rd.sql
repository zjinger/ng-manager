CREATE TABLE IF NOT EXISTS rd_stages (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  sort INTEGER NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_rd_stages_project_name ON rd_stages(project_id, name);
CREATE INDEX IF NOT EXISTS idx_rd_stages_project_id ON rd_stages(project_id, sort ASC);

CREATE TABLE IF NOT EXISTS rd_items (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  rd_no TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  stage_id TEXT,
  type TEXT NOT NULL,
  status TEXT NOT NULL,
  priority TEXT NOT NULL,
  assignee_id TEXT,
  assignee_name TEXT,
  creator_id TEXT NOT NULL,
  creator_name TEXT NOT NULL,
  reviewer_id TEXT,
  reviewer_name TEXT,
  progress INTEGER NOT NULL DEFAULT 0,
  plan_start_at TEXT,
  plan_end_at TEXT,
  actual_start_at TEXT,
  actual_end_at TEXT,
  blocker_reason TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (stage_id) REFERENCES rd_stages(id)
);

CREATE INDEX IF NOT EXISTS idx_rd_items_project_id ON rd_items(project_id);
CREATE INDEX IF NOT EXISTS idx_rd_items_stage_id ON rd_items(stage_id);
CREATE INDEX IF NOT EXISTS idx_rd_items_status ON rd_items(status);
CREATE INDEX IF NOT EXISTS idx_rd_items_assignee_id ON rd_items(assignee_id);
CREATE INDEX IF NOT EXISTS idx_rd_items_updated_at ON rd_items(updated_at DESC);

CREATE TABLE IF NOT EXISTS rd_logs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  content TEXT,
  operator_id TEXT,
  operator_name TEXT,
  meta_json TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (item_id) REFERENCES rd_items(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_rd_logs_item_id ON rd_logs(item_id, created_at DESC);
