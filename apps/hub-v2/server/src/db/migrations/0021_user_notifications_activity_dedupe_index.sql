CREATE INDEX IF NOT EXISTS idx_user_notifications_activity_dedupe_lookup
ON user_notifications (user_id, entity_type, entity_id, kind, unread, created_at DESC);
