SET lock_timeout = '5s';
SET statement_timeout = '5min';

DROP INDEX IF EXISTS auth.sessions_active_user_idx;

CREATE INDEX sessions_active_user_cover_idx
    ON auth.sessions (user_id, expires_at DESC, created_at DESC)
	INCLUDE (id, family_id, refresh_token_hash, device_id, ip, user_agent)
    WHERE revoked_at IS NULL;

CREATE INDEX sessions_active_family_idx
    ON auth.sessions (family_id, expires_at DESC)
	INCLUDE (id, user_id, refresh_token_hash, device_id)
    WHERE revoked_at IS NULL;
