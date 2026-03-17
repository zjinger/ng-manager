CREATE TABLE IF NOT EXISTS rd_stages (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  sort INTEGER NOT NULL DEFAULT 0,
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(project_id, name),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_rd_stages_project_id ON rd_stages(project_id);
CREATE INDEX IF NOT EXISTS idx_rd_stages_sort ON rd_stages(project_id, sort);

CREATE TABLE IF NOT EXISTS rd_items (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  rd_no TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  stage_id TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL,
  priority TEXT NOT NULL,
  assignee_id TEXT,
  assignee_name TEXT,
  creator_id TEXT NOT NULL,
  creator_name TEXT NOT NULL,
  reviewer_id TEXT,
  reviewer_name TEXT,
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  plan_start_at TEXT,
  plan_end_at TEXT,
  actual_start_at TEXT,
  actual_end_at TEXT,
  blocker_reason TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(project_id, rd_no),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (stage_id) REFERENCES rd_stages(id)
);

CREATE INDEX IF NOT EXISTS idx_rd_items_project_id ON rd_items(project_id);
CREATE INDEX IF NOT EXISTS idx_rd_items_stage_id ON rd_items(stage_id);
CREATE INDEX IF NOT EXISTS idx_rd_items_status ON rd_items(project_id, status);
CREATE INDEX IF NOT EXISTS idx_rd_items_assignee_id ON rd_items(project_id, assignee_id);
CREATE INDEX IF NOT EXISTS idx_rd_items_updated_at ON rd_items(project_id, updated_at);

CREATE TABLE IF NOT EXISTS rd_logs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  operator_id TEXT,
  operator_name TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES rd_items(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_rd_logs_item_id ON rd_logs(item_id);
CREATE INDEX IF NOT EXISTS idx_rd_logs_created_at ON rd_logs(item_id, created_at);
