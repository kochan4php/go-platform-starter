## Change

- [ ] Tests cover the changed behavior.
- [ ] Documentation and generated artifacts are current.

## SQL / migration review

- [ ] No existing applied migration was edited; a new numbered up/down pair was added.
- [ ] `node scripts/check-migrations.mjs check <base-sha>` passes.
- [ ] Queries are parameterized, bounded, and use a stable order for pagination.
- [ ] The endpoint's slow-query budget and representative `EXPLAIN (ANALYZE, BUFFERS)` were reviewed.
- [ ] New constraints and indexes have `ck_`, `fk_`, `uq_`, or `ix_` names.
- [ ] Large-table indexes use `CONCURRENTLY`; lock and statement timeouts are set.
- [ ] Rollback, backfill, and mixed-version deploy behavior are documented.
