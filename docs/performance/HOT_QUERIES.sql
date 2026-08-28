-- Run on a production-like snapshot after migrations. Keep ANALYZE out of
-- automated deploys: it executes statements and timings depend on hardware.

EXPLAIN (ANALYZE, BUFFERS, WAL, SETTINGS)
SELECT id, email, display_name, status, last_login_at, created_at, updated_at
FROM users.users
WHERE deleted_at IS NULL
ORDER BY created_at DESC, id DESC
LIMIT 50;

EXPLAIN (ANALYZE, BUFFERS, WAL, SETTINGS)
SELECT id, family_id, refresh_hash, expires_at, created_at
FROM auth.sessions
WHERE user_id = 1 AND revoked_at IS NULL AND expires_at > now()
ORDER BY expires_at DESC, created_at DESC;

EXPLAIN (ANALYZE, BUFFERS, WAL, SETTINGS)
SELECT rp.role_id, p.name
FROM rbac.role_permissions rp
JOIN rbac.permissions p ON p.id = rp.permission_id
ORDER BY rp.role_id, p.name;

SELECT schemaname, relname, indexrelname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan ASC, pg_relation_size(indexrelid) DESC;

SELECT schemaname, relname, n_live_tup, n_dead_tup, last_autovacuum, last_autoanalyze
FROM pg_stat_user_tables
ORDER BY n_dead_tup DESC;
