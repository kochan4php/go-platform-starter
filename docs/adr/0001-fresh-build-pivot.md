# ADR-0001: Fresh-build pivot — Go microservices + microfrontend monorepo

Status: accepted
Date: 2026-08-24
Deciders: repository owner and platform maintainers
Supersedes: all pre-wipe ADRs and PLAN v5 (parity-based)
Superseded by: none

## Context

The repository previously contained a complete TypeScript API (Express 5, Sequelize,
Socket.IO, 59-test suite). The owner directed a full pivot: backend rewritten in Go as
microservices behind a Go gateway, React microfrontends in the same monorepo, every
deployable shipping its own Dockerfile / Jenkinsfile / compose / k8s+HPA manifests.
The old codebase was deleted outright (recoverable in git history) rather than frozen.

## Decisions

1. **Go microservices**: `gateway`, `auth`, `users`, `rbac`, `realtime`, `worker` under
   `services/*`; single root `go.mod`; isolation enforced by the compiler via
   `services/<svc>/internal/` plus depguard bans. Shared code lives in `internal/platform`.
2. **GORM replaces sqlc/pgx-direct** (reversal of the pre-wipe decision): velocity and
   ecosystem win at this scale; reflection overhead accepted. Migrations remain
   **golang-migrate with hand-written SQL pairs; AutoMigrate banned everywhere**;
   expand/contract rule for zero-downtime rolling deploys.
3. **Spec-first without a behavioral contract** (reversal of v5's parity strategy):
   the legacy TS suite died with the wipe. Each service's `openapi.yaml` is the single
   contract; tests assert against spec + pinned envelope shapes. Behavioral regressions
   vs the old TS API are accepted — no production consumers depend on it.
4. **Schema-per-service** on one Postgres cluster (`auth`, `users`, `rbac`, `audit`);
   per-service creds scoped to their own schema; zero cross-schema writes anywhere —
   lifecycle changes ride Redis Streams events instead.
5. **Ops files per component**: every service and microfrontend owns its
   Dockerfile, thin Jenkinsfile (shared library `infra/jenkins`), compose file and
   k8s manifests including an HPA; migrations run via k8s Job before rollout.

## Consequences

+ Independent scaling and release cadence per service; compiler-enforced boundaries
+ Velocity from GORM; contracts stay language-neutral via OpenAPI
− Two toolchains (Node for web only); distributed failure modes require tracing,
  timeout budgets and resilience drills from day one
− No behavioral safety net vs the old API; regressions are tolerated by design

Reversal path: envelopes, health payloads, token claims, event names and specs are
pinned in-repo, so any single service can be re-absorbed or rewritten independently.
