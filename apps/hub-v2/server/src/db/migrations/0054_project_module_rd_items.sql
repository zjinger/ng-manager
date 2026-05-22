CREATE TABLE IF NOT EXISTS project_module_rd_items (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  module_id TEXT NOT NULL,
  rd_item_id TEXT NOT NULL,
  sort INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(module_id, rd_item_id),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (module_id) REFERENCES project_modules(id) ON DELETE CASCADE,
  FOREIGN KEY (rd_item_id) REFERENCES rd_items(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_project_module_rd_items_project_module
  ON project_module_rd_items(project_id, module_id);

CREATE INDEX IF NOT EXISTS idx_project_module_rd_items_project_rd_item
  ON project_module_rd_items(project_id, rd_item_id);

CREATE INDEX IF NOT EXISTS idx_project_module_rd_items_module_sort
  ON project_module_rd_items(module_id, sort);
