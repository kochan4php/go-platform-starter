# Observability

The platform uses one correlated telemetry path: browser request ID -> gateway
HTTP span -> downstream span -> Redis Stream context -> worker/realtime span.
W3C `traceparent`, `tracestate`, and `baggage` are propagated across HTTP,
streams, and WebSocket messages. Structured logs include `request_id` and
`trace_id` whenever a trace is active.

## Run the stack

```sh
docker compose -f infra/compose.base.yml -f infra/compose.observability.yml up -d
```

| UI | Local URL | Purpose |
| --- | --- | --- |
| Grafana | `http://127.0.0.1:3000` | dashboards, logs, traces, profiles |
| Prometheus | `http://127.0.0.1:9090` | metrics and rule evaluation |
| Alertmanager | `http://127.0.0.1:9093` | alert grouping and routing |
| Mailpit | `http://127.0.0.1:8025` | development email alert sink |
| Tempo | `http://127.0.0.1:3200` | trace storage API |
| Loki | `http://127.0.0.1:3100` | structured log storage API |
| Pyroscope | `http://127.0.0.1:4040` | continuous profiles |

Anonymous Grafana access is Viewer-only. Set `GRAFANA_ADMIN_PASSWORD` for the
admin login. Production must replace the placeholder Slack and Discord URLs
in `infra/alertmanager/alertmanager.yml` through its secret deployment step;
email routes to the local Mailpit sink by default.

## What is measured

- HTTP: request count, status/error code, route latency, upstream latency,
  request/trace ID, user ID on authenticated spans, and sampled access logs.
- Identity/RBAC: registrations, login outcomes, lockouts, active sessions,
  role changes, and permission creation.
- Data: bounded query-operation histograms, slow-query logs,
  `pg_stat_statements`, Postgres pool/exporter metrics, Redis latency, and safe
  SCAN-based big-key reports.
- Async/realtime: per-handler worker success/failure rate, stream lag, DLQ
  depth, message spans, WebSocket message spans, and current connections.
- Browser: LCP/CLS/INP, boundary/unhandled errors, request IDs, and the last 20
  privacy-safe click/submit/navigation breadcrumbs.
- Runtime: Go heap/GC/goroutines/threads, process file descriptors, build
  version/commit/date, health/readiness, node resources, certificates, and
  synthetic login availability.

Metric labels are intentionally bounded. Routes use Chi patterns; DB labels
use a fixed operation/table catalog; worker handlers, outcomes, Web Vitals,
error codes, and log levels are enumerations. User IDs, emails, request IDs,
trace IDs, raw paths, SQL, and exception messages are never metric labels.
The stable API error-code catalog is:

| Code | Meaning |
| --- | --- |
| `bad_request` / `invalid_request` | The request syntax or values are invalid. |
| `body_too_large` | The request exceeds the accepted body limit. |
| `unsupported_media_type` | The request content type is not supported. |
| `unauthorized` / `invalid_credentials` | Authentication is absent or rejected. |
| `forbidden` / `authorization_unavailable` | Access is denied or cannot be safely evaluated. |
| `not_found` | The requested resource does not exist. |
| `conflict` / `stale_token` | Current state conflicts with the requested mutation or authorization snapshot. |
| `invalid_idempotency_key` / `idempotency_mismatch` / `request_in_progress` | An idempotent mutation cannot be admitted or replayed safely. |
| `rate_limited` / `rate_limit_unavailable` | The request is throttled or cannot be safely admitted. |
| `upstream_unavailable` | A required downstream service is unavailable. |
| `internal_server_error` | An unexpected server failure occurred. |

`api_errors_total{code,status}` records this catalog. Add a new code only when
clients can act on it differently; never copy an exception message into the
`code` label.

Use the following audit before adding a label:

```promql
topk(20, count by (__name__)({__name__=~".+"}))
```

Review any rapidly growing series count and remove identity- or payload-derived
labels. Logs mask email addresses before serialization. Docker logs rotate at
10 MiB x 3 files; Loki retains 14 days, Tempo 7 days, and persistent volumes
own the remaining lifecycle.

## Sampling and focused debug

- `OTEL_TRACE_SAMPLE_RATIO` controls head sampling (`0..1`, default `1`).
- The collector always retains errors and requests slower than 500 ms, plus a
  10% baseline sample. Keep head sampling at `1` when relying on tail sampling.
- `SLOW_QUERY_SAMPLE_RATE` samples slow-query log records (`0..1`).
- `ACCESS_LOG_SAMPLE_RATE` samples only paths in
  `ACCESS_LOG_SAMPLE_PATHS` (default health/readiness/metrics).
- An operator can request debug records with `X-Debug-Log: 1` plus
  `X-Debug-Token`. The value must match `DEBUG_REQUEST_TOKEN`; the token is
  never logged or returned.

## Profiling

The observability overlay exposes pprof only to the private Compose network and
Alloy continuously forwards profiles to Pyroscope. For an isolated local
service, bind pprof to loopback:

```sh
PPROF_ADDR=127.0.0.1:6060 go run ./services/auth
go tool pprof http://127.0.0.1:6060/debug/pprof/profile?seconds=30
go tool pprof http://127.0.0.1:6060/debug/pprof/heap
```

Never publish port 6060 through a public ingress.

## Postgres and Redis

New databases enable `pg_stat_statements` from
`infra/postgres/observability.sql`. For an existing volume, run once as a
database administrator and restart Postgres after enabling the preload:

```sql
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
```

Run the safe big-key audit with observer credentials:

```sh
REDIS_ADDR=127.0.0.1:6379 REDIS_EXPORTER_USER=observer \
REDIS_EXPORTER_PASSWORD=... scripts/redis-bigkeys.sh
```

Schedule it off-peak; it uses Redis `SCAN`, not blocking `KEYS *`.

## Synthetic and external uptime

The local blackbox probe performs a real POST to the login endpoint using the
lab bootstrap account. UAT/production must render a dedicated, least-privilege
synthetic account into the blackbox configuration and alert on
`probe_success{job="synthetic-login"}`. An external uptime provider should
probe `/healthz` every minute from at least two regions and `/status` for the
human-readable dependency view. Do not expose `/readyz` dependency errors if
they reveal internal topology at the public edge.

## SLO and error budget policy

Each service targets 99.9% successful requests over a rolling 30-day window
and p95 latency below one second. This permits about 43 minutes of unavailable
time per month. The SLO dashboard shows availability, p95, remaining budget,
and burn rate. A 14.4x burn pages after five minutes; a 6x burn warns after one
hour. During an exhausted budget, pause non-essential releases and prioritize
reliability work until the rolling budget is positive. Planned maintenance is
not silently removed; annotate it and account for it explicitly.

Alert response procedures are in [ONCALL.md](ONCALL.md). Use
[incident timeline](templates/INCIDENT_TIMELINE.md) during response and
[postmortem](templates/POSTMORTEM.md) after a material incident.

## Deploy annotations

`scripts/deploy.sh` posts a Grafana annotation after a healthy rollout when
`GRAFANA_URL` and a service-account `GRAFANA_TOKEN` are present. It can also be
called directly:

```sh
GRAFANA_URL=https://grafana.example.com GRAFANA_TOKEN=... \
APP_VERSION=v1.2.3 GIT_COMMIT=abc123 scripts/annotate-deploy.sh prod
```

Validate configuration and thresholds with:

```sh
promtool check config infra/prometheus/prometheus.yml
promtool test rules infra/prometheus/alerts.test.yml
```
