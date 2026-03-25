CREATE TABLE IF NOT EXISTS profile_notification_prefs (
  account_id TEXT PRIMARY KEY,
  channels_json TEXT NOT NULL DEFAULT '{}',
  events_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (account_id) REFERENCES admin_accounts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_profile_notification_prefs_updated_at
  ON profile_notification_prefs(updated_at DESC);
