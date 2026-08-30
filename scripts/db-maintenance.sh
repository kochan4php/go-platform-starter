#!/usr/bin/env sh
set -eu

: "${DATABASE_URL:?set DATABASE_URL}"
ROOT="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -X -f "$ROOT/infra/postgres/data-operations.sql"

# PostgreSQL autovacuum is the primary scheduler. This weekly safety pass only
# targets the four owned schemas and never uses VACUUM FULL (which takes an
# exclusive table lock).
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -X <<'SQL'
SELECT format('VACUUM (ANALYZE) %I.%I;', schemaname, relname)
FROM pg_stat_user_tables
WHERE schemaname IN ('auth', 'users', 'rbac', 'audit')
  AND (last_autovacuum IS NULL OR last_autovacuum < now() - interval '7 days')
\gexec
SQL

if [ "${APPLY_UNUSED_INDEX_CLEANUP:-0}" = "1" ]; then
  # Guardrail: statistics must cover at least 30 days. Constraint-backed and
  # small indexes are excluded; every drop is online and printed by psql.
  stats_age_days="$(psql "$DATABASE_URL" -AtX -v ON_ERROR_STOP=1 -c \
    "SELECT coalesce(extract(day FROM now() - stats_reset)::int, 0) FROM pg_stat_database WHERE datname = current_database()")"
  [ "$stats_age_days" -ge "${MIN_INDEX_STATS_DAYS:-30}" ] || {
    echo "refusing unused-index cleanup: statistics are only ${stats_age_days} days old" >&2
    exit 1
  }
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -X <<'SQL'
SELECT format('DROP INDEX CONCURRENTLY IF EXISTS %I.%I;', s.schemaname, s.indexrelname)
FROM pg_stat_user_indexes s
LEFT JOIN pg_constraint c ON c.conindid = s.indexrelid
WHERE s.schemaname IN ('auth', 'users', 'rbac', 'audit')
  AND s.idx_scan = 0 AND c.oid IS NULL
  AND s.indexrelname NOT LIKE '%_pkey'
  AND pg_relation_size(s.indexrelid) >= 1048576
\gexec
SQL
fi

alerts="$(psql "$DATABASE_URL" -AtX -v ON_ERROR_STOP=1 -c "
  SELECT count(*) FROM pg_stat_user_tables
  WHERE schemaname IN ('auth','users','rbac','audit')
    AND n_live_tup >= 10000 AND n_dead_tup > n_live_tup * 0.20;")"
[ "$alerts" -eq 0 ] || {
  echo "database maintenance alert: $alerts table(s) remain above the 20% dead-row budget" >&2
  exit 1
}

echo "database maintenance report and vacuum/analyze pass complete"
