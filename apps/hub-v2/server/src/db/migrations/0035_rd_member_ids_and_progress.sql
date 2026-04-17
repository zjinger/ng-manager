-- 新增 member_ids JSON 字段（团队成员）
ALTER TABLE rd_items ADD COLUMN member_ids TEXT;

-- 新建个人进度表
CREATE TABLE IF NOT EXISTS rd_item_progress (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  progress INTEGER NOT NULL DEFAULT 0,
  note TEXT,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (item_id) REFERENCES rd_items(id) ON DELETE CASCADE,
  UNIQUE (item_id, user_id)
);

-- 新建进度历史表
CREATE TABLE IF NOT EXISTS rd_progress_history (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  old_progress INTEGER,
  new_progress INTEGER NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (item_id) REFERENCES rd_items(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_rd_progress_item_id
ON rd_item_progress(item_id);

CREATE INDEX IF NOT EXISTS idx_rd_progress_user_id
ON rd_item_progress(user_id);

CREATE INDEX IF NOT EXISTS idx_rd_progress_history_item_id
ON rd_progress_history(item_id, created_at DESC);