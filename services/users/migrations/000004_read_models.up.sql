SET lock_timeout = '5s';
SET statement_timeout = '5min';

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
