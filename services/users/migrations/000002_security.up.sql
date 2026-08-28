ALTER TABLE users.users
    ADD COLUMN IF NOT EXISTS password_history TEXT[] NOT NULL DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS mfa_secret_enc TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS users_active_idx
    ON users.users (created_at DESC, id)
    WHERE status <> 'deleted';
