# On-call alert runbook

Start every alert by opening the Platform service dashboard, SLO dashboard,
and correlated Loki logs for the affected `instance`. Record actions and UTC
timestamps in the incident timeline. Prefer rollback or traffic reduction over
live data repair.

## PlatformErrorRateAnomaly

Compare the 5-minute and 1-hour error ratios, group errors by stable API code,
then inspect the newest deployment annotation and trace exemplars. Roll back a
correlated release; otherwise isolate the failing upstream. Resolve when the
5-minute ratio returns to baseline for 15 minutes.

## PlatformHigh5xxRate

Identify the service and route with the largest 5xx contribution, inspect its
trace and dependency spans, and check DB/Redis saturation. Roll back or shed
non-essential traffic. Resolve below 2% for 15 minutes.

## PlatformHighP95Latency

Split latency by route, query operation, and upstream span. Check pool usage,
Redis latency, GC, and recent deploys. Roll back regressions or reduce load.
Resolve when p95 remains below one second for 15 minutes.

## AuthLoginFailureRate

Compare failure traffic, lockouts, rate limits, and synthetic login results.
Confirm whether this is credential abuse, an auth regression, or an upstream
failure without exposing account existence. Tighten rate limits for abuse or
roll back auth changes. Resolve after 15 healthy minutes.

## AuthSessionErrors

Check auth `/readyz`, Postgres/Redis health, and auth logs correlated by
`request_id` for refresh, session-list, and logout-all requests. Confirm token
verification and session queries are not timing out. Escalate to Identity if
the error rate remains above threshold after dependency recovery.

## FrontendErrorBurst

Group reports by release and route, inspect privacy-safe breadcrumbs and the
last request ID, then follow the trace into the backend. Roll back the frontend
release or disable the affected feature. Resolve after the error rate returns
to baseline for 15 minutes.

## WorkerDLQNotEmpty

Inspect DLQ handler/event counts and the originating trace before replay. Fix
the poison cause, replay a small batch with the offline DLQ credential, and
confirm idempotency. Resolve only when depth is zero and failure rate is normal.

## MailQueueBacklog

Check worker availability, mail handler failure rate, SMTP latency, and provider
status. Enable the configured fallback provider or reduce enqueue rate. Resolve
when lag drains below 20 and remains stable.

## SlowDatabaseQueries

Use the DB operation panel and `pg_stat_statements` to identify query IDs;
inspect plans without copying sensitive bind values into chat or tickets. Stop
runaway work, add an index only with plan evidence, or roll back the query.
Resolve when p95 remains below one second.

## RedisHighLatency

Check command latency, CPU, memory, evictions, slowlog, and stream lag. Run the
SCAN-based big-key report off-peak. Remove abusive keys/commands or scale Redis;
never run `KEYS *` in production. Resolve below 10 ms for 15 minutes.

## SyntheticLoginFailed

Test public DNS/TLS, gateway health, auth readiness, and the dedicated synthetic
credential. Do not reset a real user's password. Restore the route or rotate
only the synthetic secret. Resolve after five consecutive successful probes.

## HostDiskUsageHigh / HostDiskSpaceCritical

Locate the growing filesystem and verify Loki/Docker/backup retention. Remove
only confirmed disposable data or expand the volume. Never delete database or
Redis files manually. Resolve above 20% free space.

## HostMemoryPressure

Check per-container memory, swap activity, OOM events, and request concurrency.
Stop a leak or abusive workload before increasing memory; scale vertically when
the working set is legitimate. Resolve above 20% available memory for 30 minutes.

## HostCPUHigh

Correlate CPU with request rate, throttling, database work, and background jobs.
Rate-limit abusive traffic, reduce nonessential workers, or scale according to
the capacity playbook. Resolve below 70% for 30 minutes.

## DNSResolutionFailed

Compare both external resolvers, authoritative nameservers, DNSSEC, and the
application hostname from a second network. Fail over only to a pre-validated
target and avoid repeated record changes. Resolve after five successful probes.

## CertificateExpiresSoon

Verify the hostname and issuer, renew through the normal certificate process,
deploy, then confirm the served chain externally. Resolve when expiry exceeds
30 days.

## SLOBurnRateFast

Declare an incident, stop releases, identify the dominant failing service and
route, and mitigate immediately by rollback, failover, or traffic shedding.
Resolve when burn is below 6x and the fast window is healthy.

## SLOBurnRateSlow

Assign an owner, pause risky changes to the affected service, and schedule the
highest-impact reliability fix. Resolve below 2x for six hours.
