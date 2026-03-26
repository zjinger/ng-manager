CREATE TABLE IF NOT EXISTS personal_api_tokens (
  id TEXT PRIMARY KEY,
  owner_user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  token_prefix TEXT NOT NULL UNIQUE,
  token_hash TEXT NOT NULL,
  scopes_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  expires_at TEXT,
  last_used_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (owner_user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_personal_api_tokens_owner_user_id
  ON personal_api_tokens(owner_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_personal_api_tokens_status
  ON personal_api_tokens(status);
