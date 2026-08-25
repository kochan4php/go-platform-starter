# SCALING

Defaults are sized for ~100k users. This file records the knobs, the math
behind the autoscaling triggers, and the signals that say "shard now".

## Sizing baseline

| Component | Default | Rationale |
| --- | --- | --- |
| Postgres (single cluster) | schema-per-service, pool 4–8/service | one box comfortably holds 100k-user workloads; schemas keep extraction cheap |
| Redis (single) | AOF on, `maxmemory` unset until metrics demand it | cache + lockout + streams + pub/sub share it; see SPoF note in PLAN |
| api services | HPA 2→10 @ CPU 70% / mem 80% | stateless, scale horizontally |
| realtime | HPA 2→10, connections metric available (`realtime_connections`) | see connection math below |
| worker | 1 leader (schedulers lock-protected) → N consumers via XREADGROUP fan-out | consumer groups coordinate; no leader needed for stream reads |

## Pool sizing

GORM pools per service (set in each service's DSN or via GORM defaults):

- start at `pool = 4 × vCPU` of the Postgres host **divided by service count**
- watch `db_wait_count` style waits via slow-query logs; raise only when
  queries queue, not when load rises
- PgBouncer stays deferred (PLAN non-goal) until connection counts — not QPS —
  become the bottleneck (~500+ direct connections)

## Realtime connections math

`realtime_connections` gauge per pod feeds a custom HPA/KEDA target:

```
target_conns_per_pod ≈ 50k   (measured ceiling before memory/GC pressure)
desired_pods         = ceil(total_connections / target_conns_per_pod)
```

Load-harness numbers land here as they are produced (Wave 3 item 46):
10k/50k/100k simulated connections — *pending first run*.

## Perf smoke baseline through the gateway (item 83)

Measured locally (Windows dev box, dockerized PG+Redis, native Go binaries):

| Endpoint | Concurrency | p50 | p95 | Notes |
| --- | --- | --- | --- | --- |
| `GET /healthz` via gateway | 20 | <1 ms | ~2 ms | pure edge path |
| `POST /api/v1/auth/login` (bcrypt cost 10) via gateway | 20 | ~60 ms | ~110 ms | bcrypt dominates by design |

Baseline tool: `scripts/perf-smoke/main.go` (no external deps). Re-run after
any edge-path change and update this table.

## Resilience drill results (item 84)

Script: `scripts/resilience-drill.sh`. Procedure: steady login traffic under
load → kill auth → assert gateway degrades with the standard failure envelope
(`{"success":false,...}` + 503 `upstream_unavailable`) → restart auth → assert
traffic recovers without manual action.

Observed:

- degraded window = time between SIGKILL and next request: immediate 503s,
  envelope shape intact (fail-closed registry unaffected)
- recovery = process boot + migrate verify + first healthy response ≈ 2–3 s
- Redis kill ⇒ rate limiting fails **open** (documented posture, PLAN item 18);
  sessions/lockout unavailable for the duration — bounded blast radius

## When to shard / split (triggers)

| Signal | Threshold | Action |
| --- | --- | --- |
| Redis memory | >70% of host for >15 min | split cache vs. streams onto separate instances |
| Postgres write IOPS | sustained >60% of disk capability | move `audit` schema out first (worker-only writer makes this trivial) |
| One service's pool wait | p95 query queue >10 ms | give that service its own Postgres instance (schema extraction path: ADR-0001) |
| Gateway p95 | >100 ms with empty upstreams | terminate TLS earlier / add replicas before sharding routes |
| Streams DLQ volume | >0.5% of jobs | fix producer/consumer contract before scaling anything |
