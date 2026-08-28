ALTER TABLE auth.sessions
    ADD COLUMN IF NOT EXISTS device_id TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS sessions_active_user_idx
    ON auth.sessions (user_id, created_at DESC)
    WHERE revoked_at IS NULL;
