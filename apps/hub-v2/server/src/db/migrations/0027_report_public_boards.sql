-- 公开看板（快照）
CREATE TABLE IF NOT EXISTS report_public_boards (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  share_token TEXT NOT NULL UNIQUE,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_report_public_boards_created_by
  ON report_public_boards(created_by);

CREATE TABLE IF NOT EXISTS report_public_board_items (
  id TEXT PRIMARY KEY,
  board_id TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  title TEXT NOT NULL,
  natural_query TEXT NOT NULL,
  sql TEXT NOT NULL,
  params_json TEXT NOT NULL,
  blocks_json TEXT NOT NULL,
  layout_size TEXT NOT NULL DEFAULT 'wide' CHECK (layout_size IN ('compact', 'wide')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (board_id) REFERENCES report_public_boards(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_report_public_board_items_board_sort
  ON report_public_board_items(board_id, sort_order);
