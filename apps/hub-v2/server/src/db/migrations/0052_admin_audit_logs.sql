CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id TEXT PRIMARY KEY,
  module TEXT NOT NULL CHECK (module IN ('user', 'organization', 'title', 'role', 'permission', 'settings')),
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete', 'enable', 'disable', 'reset', 'assign', 'remove')),
  level TEXT NOT NULL DEFAULT 'info' CHECK (level IN ('info', 'warn', 'error')),
  actor_id TEXT,
  actor_name TEXT,
  actor_user_id TEXT,
  target_type TEXT,
  target_id TEXT,
  target_name TEXT,
  summary TEXT NOT NULL,
  ip TEXT,
  user_agent TEXT,
  request_id TEXT,
  before_json TEXT,
  after_json TEXT,
  meta_json TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at ON admin_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_module_action ON admin_audit_logs(module, action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_level ON admin_audit_logs(level, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_actor ON admin_audit_logs(actor_id, actor_user_id, created_at DESC);
