DROP INDEX IF EXISTS users.users_email_active_idx;
DROP INDEX IF EXISTS users.users_active_created_idx;

CREATE INDEX users_active_idx
    ON users.users (created_at DESC, id)
    WHERE status <> 'deleted';
