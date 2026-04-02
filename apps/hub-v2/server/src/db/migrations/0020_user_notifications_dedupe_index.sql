CREATE INDEX IF NOT EXISTS idx_user_notifications_dedupe_lookup
ON user_notifications (user_id, entity_type, entity_id, action, unread, created_at DESC);
