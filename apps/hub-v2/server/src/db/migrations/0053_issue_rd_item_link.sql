ALTER TABLE issues ADD COLUMN rd_item_id TEXT;
ALTER TABLE issues ADD COLUMN rd_no_snapshot TEXT;
ALTER TABLE issues ADD COLUMN rd_title_snapshot TEXT;
ALTER TABLE issues ADD COLUMN rd_status_snapshot TEXT;

CREATE INDEX IF NOT EXISTS idx_issues_rd_item_id ON issues(rd_item_id);
