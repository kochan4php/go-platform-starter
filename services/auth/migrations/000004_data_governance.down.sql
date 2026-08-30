SET lock_timeout = '5s';
SET statement_timeout = '5min';

DROP TRIGGER IF EXISTS trg_sessions_change_log ON auth.sessions;
DROP FUNCTION IF EXISTS auth.capture_row_change();
DROP TABLE IF EXISTS auth.change_log;
DROP TRIGGER IF EXISTS trg_sessions_updated_at ON auth.sessions;
DROP FUNCTION IF EXISTS auth.set_updated_at();
ALTER TABLE auth.sessions DROP CONSTRAINT IF EXISTS ck_sessions_expiry_after_creation;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'auth.sessions'::regclass
          AND conname = 'uq_sessions_refresh_token_hash'
    ) THEN
        ALTER TABLE auth.sessions
            RENAME CONSTRAINT uq_sessions_refresh_token_hash TO sessions_refresh_token_hash_key;
    END IF;
END $$;

ALTER TABLE auth.sessions
    DROP COLUMN IF EXISTS updated_at,
    DROP COLUMN IF EXISTS updated_by,
    DROP COLUMN IF EXISTS created_by,
    DROP COLUMN IF EXISTS metadata;

ALTER SEQUENCE auth.sessions_id_seq CACHE 1;
