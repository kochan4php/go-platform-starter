SET lock_timeout = '5s';
SET statement_timeout = '5min';

DROP INDEX IF EXISTS users.users_active_idx;
ALTER TABLE users.users
    DROP COLUMN IF EXISTS deleted_at,
    DROP COLUMN IF EXISTS mfa_enabled,
    DROP COLUMN IF EXISTS mfa_secret_enc,
    DROP COLUMN IF EXISTS password_history;
