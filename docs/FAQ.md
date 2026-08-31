# Frequently asked questions

## Why one Go module for microservices?

It keeps dependency upgrades and local tooling atomic. Service packages live
under `services/<name>/internal`, so the Go compiler prevents cross-service
imports; CI adds architecture checks on top.

## Which local mode should I use?

Use `./scripts/dev-all.sh -d` for fast native development and
`./scripts/deploy-lab.sh` when debugging the production-like network, images,
or reverse proxy. UAT/demo/prod share `infra/compose.prod.yml` with separate env
files and state.

## Why is a route returning 404 even though a handler exists?

The gateway is fail-closed. A route must exist in the owning service's
`openapi.yaml`, regenerate successfully, and be loaded into the route registry.
Run `pnpm contracts` and inspect gateway startup logs.

## Where do identity and profile data live?

Auth owns credentials, sessions, and account state. Users owns the profile
projection. RBAC owns roles and permissions. Cross-service lifecycle changes
use Redis Streams; see [ADR-0003](adr/0003-users-table-ownership.md).

## Why does the frontend keep access tokens only in memory?

It reduces exposure to injected scripts. The rotating refresh token is an
HttpOnly cookie; a page reload silently refreshes through the gateway.

## Can I edit an existing migration?

No after it has landed on `main`. Add a new reversible pair. Only unsupported
pre-release history was consolidated into the initial baseline.

## How are generated files handled?

OpenAPI types, schema docs, API examples, port/env references, dependency
licenses, and Graphify output are committed. Change the source or generator,
regenerate, and commit both. CI rejects drift.

## Is multi-region enabled?

No. The repository includes readiness criteria, not an automatic topology.
Traffic management, writer fencing, residency, and failback ownership require
an explicit deployment decision.
