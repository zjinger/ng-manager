ALTER TABLE system_permissions ADD COLUMN status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive'));
ALTER TABLE system_permissions ADD COLUMN is_builtin INTEGER NOT NULL DEFAULT 1;

UPDATE system_permissions
SET status = 'active'
WHERE status IS NULL OR status = '';

UPDATE system_permissions
SET is_builtin = 1
WHERE is_builtin IS NULL;

CREATE INDEX IF NOT EXISTS idx_system_permissions_status ON system_permissions(status);
