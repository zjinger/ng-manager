ALTER TABLE admin_users ADD COLUMN user_id TEXT;
ALTER TABLE admin_users ADD COLUMN role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'user'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_users_user_id ON admin_users(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_admin_users_role ON admin_users(role);

UPDATE admin_users
SET user_id = (
  SELECT u.id FROM users u WHERE lower(u.username) = lower(admin_users.username) LIMIT 1
)
WHERE user_id IS NULL;

UPDATE admin_users
SET role = 'user'
WHERE role = 'admin' AND user_id IS NOT NULL;
