SET lock_timeout = '5s';
SET statement_timeout = '5min';

DROP MATERIALIZED VIEW IF EXISTS users.registration_daily;
DROP MATERIALIZED VIEW IF EXISTS users.dashboard_stats;
