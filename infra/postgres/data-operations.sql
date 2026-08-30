-- Read-only database health report. Run with:
-- psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f infra/postgres/data-operations.sql

\echo 'index bloat candidates'
SELECT schemaname, relname AS table_name, indexrelname AS index_name,
       pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
       idx_scan, n_dead_tup
FROM pg_stat_user_indexes
JOIN pg_stat_user_tables USING (relid, schemaname, relname)
ORDER BY n_dead_tup DESC, pg_relation_size(indexrelid) DESC;

\echo 'unused non-constraint indexes (review only)'
SELECT s.schemaname, s.relname AS table_name, s.indexrelname AS index_name,
       pg_size_pretty(pg_relation_size(s.indexrelid)) AS index_size
FROM pg_stat_user_indexes s
LEFT JOIN pg_constraint c ON c.conindid = s.indexrelid
WHERE s.idx_scan = 0 AND c.oid IS NULL
  AND s.indexrelname NOT LIKE '%_pkey'
ORDER BY pg_relation_size(s.indexrelid) DESC;

\echo 'duplicate indexes'
SELECT ns.nspname AS schema_name, tbl.relname AS table_name,
       array_agg(idx.relname ORDER BY idx.relname) AS duplicate_indexes
FROM pg_index i
JOIN pg_class idx ON idx.oid = i.indexrelid
JOIN pg_class tbl ON tbl.oid = i.indrelid
JOIN pg_namespace ns ON ns.oid = tbl.relnamespace
WHERE ns.nspname IN ('auth', 'users', 'rbac', 'audit')
GROUP BY ns.nspname, tbl.relname, i.indrelid, i.indkey, i.indclass, i.indoption, i.indexprs, i.indpred
HAVING count(*) > 1;

\echo 'foreign keys and ON DELETE behavior'
SELECT n.nspname AS schema_name, cls.relname AS table_name, con.conname,
       pg_get_constraintdef(con.oid, true) AS definition,
       CASE con.confdeltype WHEN 'a' THEN 'NO ACTION' WHEN 'r' THEN 'RESTRICT'
            WHEN 'c' THEN 'CASCADE' WHEN 'n' THEN 'SET NULL' WHEN 'd' THEN 'SET DEFAULT' END AS on_delete
FROM pg_constraint con
JOIN pg_class cls ON cls.oid = con.conrelid
JOIN pg_namespace n ON n.oid = cls.relnamespace
WHERE con.contype = 'f' AND n.nspname IN ('auth', 'users', 'rbac', 'audit')
ORDER BY 1, 2, 3;

\echo 'logical ids without a foreign key (documented service boundaries excluded by design)'
SELECT c.table_schema, c.table_name, c.column_name
FROM information_schema.columns c
WHERE c.table_schema IN ('auth', 'users', 'rbac', 'audit')
  AND c.column_name LIKE '%\_id' ESCAPE '\'
  AND NOT EXISTS (
      SELECT 1 FROM information_schema.key_column_usage k
      JOIN information_schema.table_constraints tc USING (constraint_catalog, constraint_schema, constraint_name)
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND k.table_schema = c.table_schema AND k.table_name = c.table_name AND k.column_name = c.column_name
  )
ORDER BY 1, 2, 3;

\echo 'identity/sequence capacity and gaps'
SELECT schemaname, sequencename, data_type, cache_size, last_value,
       CASE WHEN max_value > 0 THEN round(100.0 * last_value / max_value, 6) END AS percent_consumed
FROM pg_sequences
WHERE schemaname IN ('auth', 'users', 'rbac', 'audit')
ORDER BY percent_consumed DESC NULLS LAST;

SELECT format(
    'SELECT %L AS sequence_name, last_value - coalesce((SELECT max(%I) FROM %I.%I), 0) AS current_gap FROM %I.%I;',
    seq_ns.nspname || '.' || seq.relname, attr.attname, tbl_ns.nspname, tbl.relname, seq_ns.nspname, seq.relname
)
FROM pg_class seq
JOIN pg_namespace seq_ns ON seq_ns.oid = seq.relnamespace
JOIN pg_depend dep ON dep.objid = seq.oid AND dep.deptype IN ('a', 'i')
JOIN pg_class tbl ON tbl.oid = dep.refobjid
JOIN pg_namespace tbl_ns ON tbl_ns.oid = tbl.relnamespace
JOIN pg_attribute attr ON attr.attrelid = tbl.oid AND attr.attnum = dep.refobjsubid
WHERE seq.relkind = 'S' AND seq_ns.nspname IN ('auth', 'users', 'rbac', 'audit')
\gexec

\echo 'table growth inputs'
SELECT schemaname, relname, n_live_tup, n_dead_tup,
       pg_size_pretty(pg_total_relation_size(relid)) AS total_size,
       last_vacuum, last_autovacuum, last_analyze, last_autoanalyze
FROM pg_stat_user_tables
ORDER BY pg_total_relation_size(relid) DESC;

\echo 'referential integrity violations (must return zero rows)'
SELECT 'rbac.role_permissions.role_id' AS relation, count(*) AS orphan_count
FROM rbac.role_permissions rp LEFT JOIN rbac.roles r ON r.id = rp.role_id WHERE r.id IS NULL
UNION ALL
SELECT 'rbac.role_permissions.permission_id', count(*)
FROM rbac.role_permissions rp LEFT JOIN rbac.permissions p ON p.id = rp.permission_id WHERE p.id IS NULL
UNION ALL
SELECT 'rbac.user_roles.role_id', count(*)
FROM rbac.user_roles ur LEFT JOIN rbac.roles r ON r.id = ur.role_id WHERE r.id IS NULL;

\echo 'unique constraints and unique indexes'
SELECT schemaname, tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname IN ('auth', 'users', 'rbac', 'audit')
  AND indexdef LIKE 'CREATE UNIQUE INDEX%'
ORDER BY 1, 2, 3;
