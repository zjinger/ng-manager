ALTER TABLE admin_users ADD COLUMN must_change_password INTEGER NOT NULL DEFAULT 1;
ALTER TABLE admin_users ADD COLUMN last_login_at TEXT;