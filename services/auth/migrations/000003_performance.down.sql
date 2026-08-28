DROP INDEX IF EXISTS auth.sessions_active_family_idx;
DROP INDEX IF EXISTS auth.sessions_active_user_cover_idx;

CREATE INDEX sessions_active_user_idx
    ON auth.sessions (user_id, created_at DESC)
    WHERE revoked_at IS NULL;
