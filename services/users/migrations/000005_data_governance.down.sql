SET lock_timeout = '5s';
SET statement_timeout = '5min';

DROP MATERIALIZED VIEW IF EXISTS users.registration_daily;
DROP MATERIALIZED VIEW IF EXISTS users.dashboard_stats;

CREATE UNIQUE INDEX users_email_unique ON users.users (lower(email));

DROP TRIGGER IF EXISTS trg_users_change_log ON users.users;
DROP FUNCTION IF EXISTS users.capture_row_change();
DROP TABLE IF EXISTS users.change_log;
DROP TRIGGER IF EXISTS trg_users_updated_at ON users.users;
DROP FUNCTION IF EXISTS users.set_updated_at();

ALTER TABLE users.users
    DROP CONSTRAINT IF EXISTS ck_users_deleted_state,
    DROP CONSTRAINT IF EXISTS ck_users_failed_login_attempts,
    DROP CONSTRAINT IF EXISTS ck_users_email_format,
    DROP COLUMN IF EXISTS search_document,
    DROP COLUMN IF EXISTS email_domain,
    DROP COLUMN IF EXISTS metadata,
    DROP COLUMN IF EXISTS updated_by,
    DROP COLUMN IF EXISTS created_by;

ALTER TABLE users.users ALTER COLUMN status DROP DEFAULT;
ALTER TABLE users.users ALTER COLUMN status TYPE TEXT USING status::text;
ALTER TABLE users.users ALTER COLUMN status SET DEFAULT 'active';
DROP TYPE IF EXISTS users.user_status;
ALTER SEQUENCE users.users_id_seq CACHE 1;

CREATE MATERIALIZED VIEW users.dashboard_stats AS
SELECT
    1 AS id,
    COUNT(*) FILTER (WHERE deleted_at IS NULL) AS total,
    COUNT(*) FILTER (WHERE deleted_at IS NULL AND status = 'active') AS active,
    COUNT(*) FILTER (WHERE deleted_at IS NULL AND status = 'inactive') AS inactive,
    now() AS refreshed_at
FROM users.users;
CREATE UNIQUE INDEX dashboard_stats_id_unique ON users.dashboard_stats (id);

CREATE MATERIALIZED VIEW users.registration_daily AS
SELECT date_trunc('day', created_at)::date AS day, COUNT(*) AS count
FROM users.users
WHERE deleted_at IS NULL
GROUP BY date_trunc('day', created_at)::date;
CREATE UNIQUE INDEX registration_daily_day_unique ON users.registration_daily (day);
