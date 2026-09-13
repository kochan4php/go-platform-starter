# Data and migration operations

This is the operational contract for the `auth`, `users`, `rbac`, and `audit`
schemas. Migration SQL is the source of truth; `docs/data/` is generated from a
fully migrated PostgreSQL catalog.

## Required migration workflow

1. Add the next six-digit `up.sql`/`down.sql` pair; never edit an applied file.
2. Start every post-baseline migration with `SET lock_timeout = '5s'` and
   `SET statement_timeout = '5min'`.
3. Use expand/deploy/backfill/contract for incompatible changes. Large-table
   indexes use `CONCURRENTLY` and a `no-transaction` marker.
4. Run `node scripts/check-migrations.mjs lint`, then the four migration
   round-trip tests. For transaction-compatible SQL, use
   `scripts/migration-dry-run.sh <file>` against the prior schema version.
5. Run `node scripts/check-migrations.mjs snapshot` only when registering new
   migration files. CI verifies the manifest and rejects edits relative to the
   PR base.
6. Generate the schema registry with `go run ./cmd/dbdocs`; review `AUDIT.md`.

The shared Go migration runner records duration. `MIGRATION_WARN_AFTER` (30s in
production Compose) emits a structured warning when the budget is exceeded.

## Rollback playbook

Every migration has its exact rollback in the adjacent `.down.sql` file. Before
rollback: stop writers or confirm mixed-version compatibility, capture a backup,
check active locks, and set an incident owner. Run one version down, verify
`readyz` and critical reads, then either continue or re-apply up. Concurrent-index
migrations are intentionally outside a transaction; a failed build may leave an
invalid index, which must be removed with `DROP INDEX CONCURRENTLY IF EXISTS`
before retrying. Data-destructive contract migrations require a restored staging
rehearsal and a signed backup checkpoint.

## Schema standards

- UTF-8 database encoding and the database's deterministic default collation are
  mandatory. Changing collation is a rebuild, not an in-place migration.
- Unbounded strings use `TEXT`; timestamps use `TIMESTAMPTZ`; date-only facts use
  `DATE`. `VARCHAR` and timestamp-without-time-zone fail migration lint.
- Constraints use `ck_`, `fk_`, and `uq_`; ordinary indexes use `ix_`. Primary-key
  names remain PostgreSQL defaults because their meaning is unambiguous.
- Required business inputs intentionally have no database default, so omitted
  values fail fast. The generated default audit lists these columns for review;
  a nonzero count is expected and is not a drift failure by itself.
- `users.user_status` is the database enum for `active`, `inactive`, and `deleted`.
  Email grammar, lifecycle consistency, non-negative counters, role names/colors,
  permission grammar, and non-empty event names are database checks.
- Mutable catalog rows carry `created_by`/`updated_by` where an actor is useful.
  Cross-service actor and user identifiers intentionally have no FK so service
  migration order stays independent; this exception appears in the generated FK
  audit and `infra/postgres/data-operations.sql`.
- `updated_at` is maintained by schema-local triggers. Schema-local change logs
  capture row mutations; credential hashes, MFA secrets, and password history are
  removed before audit JSON is written.
- Identity sequences cache 32 values (64 for the append-heavy audit log). Gaps are
  normal after restarts; capacity—not gaplessness—is monitored.

## Search and extensibility

The users table has generated `email_domain` and `search_document` columns, a GIN
full-text index, `pg_trgm` fuzzy indexes, and non-sensitive JSONB metadata with a
GIN index. RBAC and auth metadata follow the same rule. JSONB is for sparse,
non-relational annotations only; anything filtered, joined, constrained, or
security-sensitive gets a typed column.

## Backfills and seeds

Use `platform.RunBackfill` with an idempotent query ordered by primary key. Each
callback processes and commits at most the supplied batch size, owns its durable
checkpoint (usually “rows where new_column IS NULL”), and stops cleanly on context
cancellation. Run it after expand and before contract; expose processed/error
counts through the caller's normal metrics.

RBAC catalog seeds use `rbac.seed_history` and a transaction. Each version runs
once, while every statement remains idempotent for crash recovery. The auth
bootstrap credential is deliberately not versioned: environment configuration is
authoritative and rotating it must revoke existing sessions.

## Index, integrity, and vacuum operations

`infra/postgres/data-operations.sql` reports bloat inputs, never-used indexes,
duplicate definitions, every FK and its `ON DELETE` behavior, logical IDs without
FKs, identity consumption, table size/growth inputs, and orphan counts. Unused
indexes are review candidates only: confirm at least a complete business cycle
since `stats_reset`, inspect replicas, then ship their removal as a normal
concurrent migration. The maintenance job can perform the same online cleanup
only with `APPLY_UNUSED_INDEX_CLEANUP=1`, at least 30 days of statistics, no
backing constraint, and a minimum 1 MiB index size. Automated blind drops are
prohibited.

PostgreSQL autovacuum is primary. The weekly data-operations workflow runs a
non-blocking `VACUUM (ANALYZE)` safety pass only for tables not autovacuumed in
seven days. It never runs `VACUUM FULL`.

## Query review and budgets

Any PR changing SQL completes the SQL checklist in the PR template and attaches
representative `EXPLAIN (ANALYZE, BUFFERS)` output. Server-side budget is 500ms by
default (`SLOW_QUERY_THRESHOLD`); endpoint targets are stricter:

| Endpoint class | p95 database budget |
| --- | ---: |
| auth login/refresh/introspection | 50ms |
| users list/search/detail | 100ms |
| roles/permissions reads | 100ms |
| administrative writes | 200ms |
| audit/export/report queries | 400ms |

Crossing a budget blocks the PR unless the query plan, expected cardinality, and
an explicit temporary exception are documented.

## Growth, archive, and purge

Record monthly `pg_total_relation_size`, live rows, and dead rows from the
operations report. Project 3/6/12 months with both linear growth and the peak
observed monthly rate; alert when projected primary storage reaches 70% or an
identity reaches 70% capacity. The audit log is expected to dominate growth.

Soft-deleted users retain a 30-day restore window, then the users leader-elected
housekeeping task purges them. Audit rows use `AUDIT_RETENTION_DAYS` and the worker
leader-elected purge. Change logs follow the same environment retention policy;
archive regulated history to immutable object storage before purge when required.

## Backup, PITR, masking, and recovery

Production Compose enables WAL archiving to the dedicated `wal-archive` volume;
copy that volume to durable object storage in real deployments and retain the
base backup required by the desired recovery point. A restore selects the latest
base backup before the target time, restores WAL through `recovery_target_time`,
promotes, then runs schema fingerprint and application smoke checks.

The weekly workflow creates a logical backup and restores it into the disposable
`RESTORE_TEST_DATABASE_URL`. Configure both repository secrets before relying on
the check. `scripts/mask-data.sh` clones into a target whose URL explicitly names
dev/test/staging/anon, then irreversibly replaces emails, credentials, session
tokens, profile/audit details, and change logs. Set `ANONYMIZED_DUMP` to emit the
versioned development dataset; never distribute an unmasked production dump.
