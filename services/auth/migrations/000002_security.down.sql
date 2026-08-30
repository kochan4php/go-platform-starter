SET lock_timeout = '5s';
SET statement_timeout = '5min';

DROP INDEX IF EXISTS auth.sessions_active_user_idx;
ALTER TABLE auth.sessions DROP COLUMN IF EXISTS device_id;
