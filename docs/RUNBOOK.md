# Operational runbook

This is the default operator path. Alert-specific commands and dashboards are
in [ONCALL.md](ONCALL.md); incident command is in
[INCIDENT_RESPONSE.md](INCIDENT_RESPONSE.md).

## Service inventory

| Component | Critical dependencies | Health | Primary signal |
| --- | --- | --- | --- |
| gateway | auth/users/RBAC/worker, Redis | `/healthz`, `/readyz` | request rate, p95, 5xx |
| auth | PostgreSQL, Redis, RBAC | `/healthz`, `/readyz` | login failures, session errors |
| users | PostgreSQL, Redis | `/healthz`, `/readyz` | profile errors, event lag |
| rbac | PostgreSQL, Redis | `/healthz`, `/readyz` | claim-version errors |
| worker | PostgreSQL, Redis, mail/webhook providers | `/healthz`, `/readyz` | stream lag, DLQ depth |
| realtime | Redis | `/healthz`, `/readyz` | connections, kicks, disconnects |
| scheduler | PostgreSQL, Redis | `/healthz`, `/readyz` | leader, publish failures |

Published debug ports are generated in [reference/PORTS.md](reference/PORTS.md).

## Triage

1. Declare severity and incident commander; start the incident timeline.
2. Confirm customer impact from edge probes, not only internal metrics.
3. Check recent deploy annotations and `APP_VERSION`/`GIT_COMMIT` from
   `/version`.
4. Inspect dependency readiness, saturation, stream lag, DLQ, disk, and TLS.
5. Prefer reversible mitigation: stop rollout, route traffic away, scale a
   stateless component, or disable a documented optional feature.
6. Do not run down migrations, flush Redis, delete queues, or restore over a
   live database during diagnosis.

## Common operations

```sh
# Deployment state and bounded logs
docker compose --env-file infra/.env.production -f infra/compose.prod.yml ps
docker compose --env-file infra/.env.production -f infra/compose.prod.yml logs --since=15m --tail=500 gateway

# Health and build identity
curl --fail-with-body https://<domain>/healthz
curl --fail-with-body https://<domain>/readyz
curl --fail-with-body https://<domain>/version

# Deploy current checked-out release through health gates
./scripts/deploy.sh prod

# Replay one DLQ using the offline administrator credential
docker compose --env-file infra/.env.production -f infra/compose.prod.yml run --rm \
  -e DLQ_REDIS_USERNAME=dlq-admin -e DLQ_REDIS_PASSWORD="$REDIS_DLQ_ADMIN_PASSWORD" \
  worker -replay mail.jobs
```

## Rollback

Roll application images back to the last known-good immutable tag. Additive
schema changes stay in place; application versions must remain mixed-version
compatible. A migration rollback is a separately reviewed data operation and
never an automatic deploy response. Verify health, authenticated traffic,
stream progress, and audit writes after mitigation.

## Escalation and handoff

Ownership is in [OWNERSHIP.md](OWNERSHIP.md). Hand off severity, impact,
timeline, current hypothesis, actions attempted, dashboards, query/request IDs,
and the next decision time. After recovery, open a blameless postmortem using
[the template](templates/POSTMORTEM.md).
