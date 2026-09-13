# Performance engineering evidence

This closes the Engineering items in the Performance backlog by one of three
outcomes: implemented, already native, or audited and rejected where the named
mechanism would make the starter less correct.

| Area / backlog IDs | Outcome |
| --- | --- |
| PostgreSQL P1-P4, P10-P12 | Matching partial/covering indexes and hot-query `EXPLAIN (ANALYZE, BUFFERS)` runbook; cursor pagination avoids deep OFFSET cost. Autovacuum thresholds are tightened for audit writes. |
| Database runtime P5-P6, P11, P54, P66-P68, P94 | Shared prepared-statement cache and bounded pool; environment-specific PG memory; RBAC role listing is three fixed queries instead of 2N+1; user/session joins are batched and covered; `db_query_duration_seconds{query_name}` has bounded labels. |
| Audit partitioning P9 | pg_partman was evaluated and intentionally not enabled: PostgreSQL range partitioning cannot preserve global `UNIQUE(msg_id)` unless the partition key joins the constraint. Weakening that invariant would duplicate audit events. The table instead gets aggressive autovacuum, an entity/time index, retention, and bloat monitoring. Revisit only with a versioned audit timestamp/idempotency migration. |
| Go runtime P13-P18, P26-P27, P31-P32 | Loopback-only pprof, `GOMEMLIMIT`, `GOGC`, configurable drain, startup bcrypt calibration, and a bounded 2,048-entry 30-second LRU claims cache. Production `LOG_LEVEL=info` drops debug SQL. Benchmarks cover JSON response and cursor encoding. A response-writer pool was rejected because evidence does not justify retaining buffers across requests. |
| Worker P19-P21, P69-P70 | Tunable consumer concurrency/read count, one pipelined XACK per delivery batch, and up to 100 audit entries share a DB transaction. `XAUTOCLAIM JUSTID` was rejected because handlers require payloads and re-fetching adds a round trip. |
| Gateway P22-P25, P59, P64 | Shared transport keeps 64 idle connections per host and attempts HTTP/2 for TLS upstreams; ReverseProxy streams natively. Specs remain immutable and atomically replaced by deploy. Compression uses level 5. |
| Realtime P28-P30, P81-P83 | No retained history slice exists to compact; writes remain per-connection serialized and bounded; compression uses no-context-takeover over 1 KiB; heartbeat is configurable. Sharded Pub/Sub is deferred until Redis Cluster exists because shard commands add no capacity to one Redis node. |
| Frontend P33-P50, P71-P80, P89-P90, P95 | ES2022, manifest/chunk budget reporting, hover modulepreload plus user prefetch, fixed image/skeleton geometry, local subset WOFF2 with swap, debounced/cancellable queries, previous-page data, optimistic rollback, resource-specific stale/gc policy, console stripping, CDN URL rendering, content visibility, Lighthouse budgets, and Web Vitals telemetry. Virtualization is unnecessary with the 50-row API cap. Workbox and persisted admin-query caches are rejected for authenticated data; immutable hashed HTTP caching is the safe fast path. React icon tree-shaking replaces a second sprite pipeline. Inline critical CSS was rejected because it duplicates federated stylesheet ownership and complicates the CSP posture. |
| Delivery P51-P58, P60, P84-P88 | nginx sendfile/tcp_nopush/open-file cache, Redis I/O/lazy-free, health start intervals, topology spread, per-app CI matrix, split Docker layers, BuildKit Go caches, and GHA remote caches. The pinned unprivileged nginx image lacks Brotli, so gzip level 5 plus immutable CDN assets remains. UPX was rejected because it trades startup CPU/RSS and complicates artifact inspection. Pre-commit builds were rejected because CI and BuildKit cache without slowing every commit. |
| Measurement P91-P96 | Go benchmarks, k6 thresholds/results ledger, Alloy continuous pprof scraping into Pyroscope, Postgres exporter panels, LCP/CLS/INP ingest, and route-level p95 Grafana panels. |

Operational commands:

```sh
go test -bench=. -benchmem ./internal/platform ./services/users/internal
k6 run scripts/k6/performance.js
psql "$DATABASE_URL" -f docs/performance/HOT_QUERIES.sql
```

Set `PPROF_ADDR=127.0.0.1:6060` for a local profiling agent. The observability
overlay explicitly enables private-network access for Alloy; no pprof port is
published to the host. Other non-loopback addresses are rejected by default.
Confirm Postgres memory and four Redis I/O threads
against actual CPU/memory limits before increasing them.

The current measured bundle and allocation report is in
[performance/BUNDLE_REPORT.md](performance/BUNDLE_REPORT.md).
