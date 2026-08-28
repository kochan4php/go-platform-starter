# Reliability & Resilience

This document is the engineering evidence and operating contract for backlog
items G1–G70. Defaults are deliberately bounded and can be tuned through the
production environment without changing code.

## Runtime controls

| Area | Controls | Evidence |
| --- | --- | --- |
| Gateway | circuit opens after 3 failures for 10s; GET retries up to 3 times with exponential jitter; comma-separated upstream pools; optional `x-hedge`, `x-timeout`, and `x-stale-if-error`; 100 in-flight requests per upstream | `services/gateway/internal/resilience.go`, `specs.go`, `proxy.go` |
| Postgres | boot retry for 30s, 15s statement timeout, 30s idle-transaction timeout, bounded pool | `internal/platform/database.go` |
| Redis Streams | schema `v=1`, approximate `MAXLEN=100000`, signed/encrypted payload support | `internal/platform/stream.go` |
| Worker | configurable `XAUTOCLAIM` idle time, persistent processing checkpoint, bounded DLQ, replay command, drain-before-close, webhook retries | `services/worker/internal/consumer.go`, migration `000003_reliability` |
| Realtime | ping/pong cleanup, room cap/rejection, serialized writes, ordered read loop, client exponential reconnect jitter | realtime service and `apps/web-admin-users/src/UsersPage.tsx` |
| HTTP lifecycle | dependency latency in readiness, version/commit in liveness, pre-stop drain, bounded shutdown | `internal/platform/health.go`, `server.go` |

Example gateway pool:

```env
UPSTREAMS={"auth":"http://auth-a:8080,http://auth-b:8080","users":"http://users:8080"}
GATEWAY_MAX_INFLIGHT_PER_UPSTREAM=100
```

OpenAPI route extensions accept durations such as `x-timeout: 5s`. Hedging is
off unless `x-hedge: true`; stale responses are off unless
`x-stale-if-error: true`, and the gateway refuses stale caching for protected
routes. POST callers can supply an `Idempotency-Key` (maximum 128 characters);
successful responses are replayable for 24 hours.

Strict authentication and rate-limit routes fail closed when Redis is down.
Ordinary authorized routes continue from signed JWT claims while logging the
lost claims-version check. Ordinary rate limits fail open. Counters naturally
recreate with their TTL after failover.

## Worker and DLQ operations

Production defaults:

```env
WORKER_MIN_IDLE=30s
DLQ_MAX_DEPTH=10000
STREAM_MAXLEN=100000
WEBHOOK_ALLOWED_HOSTS=hooks.example.com
```

Replay requires the offline DLQ administrator credential; application
containers do not receive it:

```sh
docker compose --env-file infra/.env.production -f infra/compose.prod.yml run --rm \
  -e DLQ_REDIS_USERNAME=dlq-admin -e DLQ_REDIS_PASSWORD="$REDIS_DLQ_ADMIN_PASSWORD" \
  worker -replay mail.jobs
```

`worker_dlq_depth`, `worker_stream_lag`, `worker_jobs_processed_total`, and
`housekeeping_rows_total` cover DLQ, mail depth, poison pills, session cleanup,
profile purge, and audit retention. Prometheus rules page on non-empty DLQs,
mail backlog, anomalous error rate, disk pressure, and TLS expiry.

## Backup and disaster recovery

The production Compose stack continuously runs Postgres and Redis backup
sidecars. The default interval is 24 hours and retention is 14 days. Postgres
uses a custom-format `pg_dump`; Redis takes an RDB snapshot while Redis itself
also runs AOF persistence. Backups live in the named `backups` volume and must
be copied to encrypted off-host storage by the operator.

Restore verification must target an empty disposable database:

```sh
BACKUP_DIR=./backups \
RESTORE_TEST_DATABASE_URL='postgres://app:app@127.0.0.1:55433/restore_test?sslmode=disable' \
./scripts/restore-test.sh
```

Targets:

- RPO: 24 hours for Postgres snapshots; approximately one second for local
  Redis AOF. Off-host replication determines site-loss RPO.
- RTO: 30 minutes for a single-node rebuild; 60 minutes when restoring both
  data stores from off-host copies.

DR procedure:

1. Provision an empty Docker host and restore the repository plus the protected
   production env file.
2. Restore `pgdata` from the newest verified dump and Redis from the newest RDB
   (or allow AOF replay when the original volume survived).
3. Run `./scripts/deploy.sh prod --no-pull`; it rebuilds images, applies
   migrations, starts dependencies in health order, and gates the public edge.
4. Verify `/healthz`, `/readyz`, an authenticated read, stream lag, and audit
   writes. Record actual RPO/RTO and rotate any credentials exposed during DR.

Run this quarterly. `scripts/resilience-drill.sh` remains the fast process-kill
recovery drill. `infra/k8s/chaos-staging.yaml` adds explicit pod-kill and 250ms
network-latency experiments and must only be applied to staging.

## Deployment safety

- Every workload has resource limits, log rotation, restart policy, startup and
  readiness probes, topology spread, termination grace, and a pre-stop drain.
- `infra/k8s/reliability.yaml` supplies disruption budgets and gateway priority.
- CI checks changed up-migrations for expand/contract violations using
  `scripts/check-migration-safety.sh`.
- `infra/nginx/canary.conf.example` is the opt-in 5% edge canary policy.
- The health-gated deploy is the supported single-host strategy. Automatic
  down-migration rollback is intentionally prohibited: a health failure rolls
  application code forward/back while additive schemas remain compatible.
  Destructive automatic schema rollback can lose writes made by the new code.
- A second Compose color is intentionally not run on the same single host: it
  doubles resource pressure without removing the host failure domain. Use the
  Kubernetes two-replica rollout/canary path when blue-green isolation is
  required.

## Multi-region readiness checklist

- [ ] Global traffic manager and health-based DNS are owned and tested.
- [ ] Postgres writer region, replica lag SLO, promotion, and fencing are defined.
- [ ] Redis topology and stream ownership avoid duplicate consumers across regions.
- [ ] Session/token keys and clock synchronization are consistent.
- [ ] Object/backups are encrypted and replicated to an independent region.
- [ ] Data residency, audit retention, and failback ownership are approved.
- [ ] Region-loss and split-brain drills meet the RTO/RPO above.

This checklist is readiness evidence, not authorization to enable multi-region;
the topology remains an operator/product decision (G8).

## Deliberate non-mechanisms

Reliability tradeoffs are explicit:

- Redis read replicas are not used for authorization, rate limiting, locks, or
  streams because stale reads violate their correctness contract.
- Audit events first enter `audit.event_outbox`; a worker relay retries rows
  left behind by a Redis outage and stable audit IDs deduplicate uncertain
  publish/delete outcomes. Other derived events remain direct Redis Streams;
  move those into service-owned transactional outboxes when services receive
  separate databases.
- Local Postgres/Redis circuit breakers are not layered on top of driver pools:
  readiness, bounded boot retry, command deadlines, and driver backoff already
  prevent retry storms. Opening a process-wide breaker would reject healthy
  pooled connections after a transient failure. The external mail path uses a
  second provider instead.
