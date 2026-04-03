-- 公开看板启用状态（支持失效后再次生效）
ALTER TABLE report_public_boards
  ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1));

CREATE INDEX IF NOT EXISTS idx_report_public_boards_active
  ON report_public_boards(is_active);
