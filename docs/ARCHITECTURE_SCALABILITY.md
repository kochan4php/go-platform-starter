# Architecture & scalability engineering

This document is the operational handoff for the implemented engineering
items in BACKLOG K1-K70. Deferred product/enterprise explorations remain
unchecked in the backlog.

## Contracts, data flow, and projections

- Shared event DTOs and stream names live in `internal/platform/events.go`.
  Registration emits `UserCreatedEvent`, including `display_name` (K2/K4).
- Every service publisher persists to `audit.event_outbox` before attempting
  Redis delivery. The worker's generic outbox relay publishes any stream, not
  only audit events (K6).
- Users and RBAC consumer groups start at stream ID `0`. Operators can reset a
  worker group with `go run ./services/worker -replay-from-start <stream>`;
  stop active workers first (K7).
- Registration is a choreographed, idempotent saga: auth commits identity and
  emits `user.created`; users updates its profile projection; RBAC assigns the
  default `user` role. Replays use upserts (K8).
- `WebhookProvider` and the existing `platform.Mailer` form anti-corruption
  boundaries: domain jobs never expose provider HTTP/SMTP response models (K9).
- The users list is the CQRS read side. Dashboard totals and daily registration
  series use concurrently refreshed materialized views, refreshed once per
  minute under a distributed scheduler lock (K5/K13/K14).

## Extension points and services

- Worker handlers implement `WorkerHandler` and register by name. Set
  `WORKER_HANDLERS=email,audit,webhook` to enable plugins per deployment
  (K20/K21).
- Gateway upstream discovery is environment-driven. Each `UPSTREAMS` value may
  contain comma-separated endpoints for failover/load distribution (K22).
- `infra/k8s/blue-green.yaml` supplies two slots and a stable Service selector;
  promotion and rollback are single selector patches (K24).
- Auth exposes `POST /internal/token/introspect`, protected by
  `X-Internal-Secret`. It checks signature, expiry, current account state, and
  current claims version (K29).
- User states use the shared active/inactive/deleted state machine. Deleted is
  terminal (K37).
- Users exposes authenticated multipart `POST /api/v1/users/avatar/resize`.
  Inputs are capped at 8 MiB and 4096x4096, then emitted as <=512x512 JPEG
  using only the Go standard library (K48).
- `services/scheduler` is a two-replica, leader-elected scheduler. Jobs come
  from `SCHEDULED_JOBS` JSON and publish through the universal outbox (K53-K55).

## Edge and infrastructure

- Redis-backed idempotency and distributed rate limiting remain the shared
  edge implementations (K56/K57).
- Vault/ESO rotation and cert-manager resources live under
  `infra/k8s/security`; rotation preserves the previous key during rollout
  and certificates rotate their private keys automatically (K60/K61).
- Gateway has two replicas behind a Kubernetes Service/HPA. Middleware names
  are selected with `GATEWAY_MIDDLEWARES` (K62/K63).
- OpenAPI extensions configure transformations and policy:
  `x-request-headers`, `x-cache-ttl`, and
  `x-consumer-quota-per-minute`. `CONSUMER_QUOTAS` JSON overrides route quotas
  by JWT subject. Cache keys include the subject (K65/K66/K68).
- `WEBSOCKET_ROUTES` maps any gateway path to an HTTP(S) upgrade target;
  `REALTIME_UPSTREAM` remains the `/ws` compatibility fallback (K67).

## Fitness gates

`node scripts/check-template-drift.mjs` detects missing template artifacts for
contract services. `node scripts/check-architecture.mjs` rejects direct
service-to-service Go imports and migrations that create another service's
schema. Both run in CI (K1/K70).

Before rollout, run `go test ./...`, both Node checks, manifest validation, and
the repository's existing contract/quality gates.
