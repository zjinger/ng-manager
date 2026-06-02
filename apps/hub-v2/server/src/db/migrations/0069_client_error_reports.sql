CREATE TABLE IF NOT EXISTS client_error_reports (
  id TEXT PRIMARY KEY,
  level TEXT NOT NULL CHECK (level IN ('info', 'warn', 'error')),
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  stack TEXT,
  source TEXT,
  lineno INTEGER,
  colno INTEGER,
  url TEXT,
  route TEXT,
  user_agent TEXT,
  ip TEXT,
  app_version TEXT,
  build_hash TEXT,
  user_id TEXT,
  username TEXT,
  request_method TEXT,
  request_url TEXT,
  status_code INTEGER,
  extra_json TEXT,
  fingerprint TEXT NOT NULL,
  occurrence_count INTEGER NOT NULL DEFAULT 1,
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_client_error_reports_fingerprint_unique
  ON client_error_reports(fingerprint);

CREATE INDEX IF NOT EXISTS idx_client_error_reports_type
  ON client_error_reports(type);

CREATE INDEX IF NOT EXISTS idx_client_error_reports_fingerprint
  ON client_error_reports(fingerprint);

CREATE INDEX IF NOT EXISTS idx_client_error_reports_last_seen_at
  ON client_error_reports(last_seen_at DESC);
