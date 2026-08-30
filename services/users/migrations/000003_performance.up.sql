SET lock_timeout = '5s';
SET statement_timeout = '5min';

DROP INDEX IF EXISTS users.users_active_idx;

CREATE INDEX users_active_created_idx
    ON users.users (created_at DESC, id DESC)
    INCLUDE (email, display_name, status, last_login_at, updated_at)
    WHERE deleted_at IS NULL;

CREATE INDEX users_email_active_idx
    ON users.users (lower(email))
    WHERE deleted_at IS NULL;
