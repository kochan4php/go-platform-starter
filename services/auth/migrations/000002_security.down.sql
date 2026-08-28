DROP INDEX IF EXISTS auth.sessions_active_user_idx;
ALTER TABLE auth.sessions DROP COLUMN IF EXISTS device_id;
