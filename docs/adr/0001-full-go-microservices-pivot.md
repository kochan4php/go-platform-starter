# ADR-0001: Full-Go microservices pivot

Status: accepted · Date: 2026-08-24 · Supersedes: PLAN v4.1 "packages, not services" position

## Context

The owner directed a pivot from the v4.1 modular-monorepo (TypeScript API + shared TS
packages) to **Go microservices** with per-service deployments autoscaled in Kubernetes,
plus the React micro-frontend shell. The v3 TypeScript API and its 59-test suite are
complete and green at `c3561d1`.

## Decision

1. All backend services are written in **Go** (`chi`, `pgx`+`sqlc`, `golang-migrate`,
   `slog`, `golang-jwt/v5`, Redis Streams, `coder/websocket`), one deployable each:
   gateway, auth, users, rbac, realtime, worker.
2. Services live in one monorepo under `services/*`; shared code in `internal/platform`;
   service isolation is enforced by import rules, not by separate repositories.
3. **Schema-per-service** on one Postgres cluster (`auth`, `users`, `rbac`), each service
   connecting with credentials scoped to its own schema; migrations embedded per service.
4. Authorization moves to **claims**: auth mints `perms[]` + `ver` into access tokens;
   the gateway verifies JWTs once and enforces a fail-closed route→permission registry.
   No per-request authorization hops.
5. The frozen TypeScript app moves to `legacy/` and its test suite becomes the
   **behavioral acceptance contract**: every Go endpoint ships with a 1:1 parity test
   before any legacy code is deleted.

## Consequences

+ Independent scaling profiles (realtime connection count HPA, worker burst, api RPS)
+ Fault isolation; per-service release cadence; polyglot option preserved
− Two toolchains (Node for web only); distributed failure modes require tracing,
  timeouts and resilience drills from day one
− Velocity dip during Waves 0–2 while parity is established

Reversal path: because envelopes, health payloads, token formats and event names are
golden-pinned, any single service can be re-absorbed or rewritten without touching clients.
