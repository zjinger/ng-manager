ALTER TABLE announcements ADD COLUMN domain TEXT NOT NULL DEFAULT 'content' CHECK (domain IN ('content', 'reimbursement'));
ALTER TABLE announcements ADD COLUMN effective_at TEXT;
ALTER TABLE announcements ADD COLUMN notify_related_users INTEGER NOT NULL DEFAULT 0 CHECK (notify_related_users IN (0, 1));

CREATE INDEX IF NOT EXISTS idx_announcements_domain ON announcements(domain);
CREATE INDEX IF NOT EXISTS idx_announcements_effective_at ON announcements(effective_at DESC);
