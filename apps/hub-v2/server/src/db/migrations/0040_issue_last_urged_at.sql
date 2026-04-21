ALTER TABLE issues ADD COLUMN last_urged_at TEXT;

CREATE INDEX IF NOT EXISTS idx_issues_last_urged_at ON issues(last_urged_at DESC);
