---
title: Home
nav_order: 1
---

# Go Platform Starter

Production-shaped Go microservices, a React micro-frontend shell, spec-first
OpenAPI contracts, PostgreSQL schema ownership, and Redis Streams — in one
repository.

## Start where your question is

| I want to… | Go to |
| --- | --- |
| get it running and ship something | [Onboarding](ONBOARDING.md) |
| understand how it fits together | [Architecture](ARCHITECTURE.md), then [detailed diagrams](DIAGRAMS.md) |
| add or change an endpoint | [API standards](API_CONTRACTS.md) and [contracts](CONTRACTS.md) |
| know what a change must carry | [Engineering guide](ENGINEERING_GUIDE.md) and [definition of done](DOD.md) |
| fix something that is on fire | [Runbook](RUNBOOK.md), then [on-call](ONCALL.md) |
| deploy it | [Infra and VPS operations](INFRA_OPS.md) |
| check what is enforced | [Security posture](SECURITY.md) and [threat model](THREAT_MODEL.md) |
| look up a port or a variable | [Published ports](reference/PORTS.md), [environment variables](reference/ENVIRONMENT.md) |

## Four rules that explain most of the code

**Service isolation is compiler-enforced.** Code lives in
`services/<name>/internal/...`, which Go refuses to let another service import.
Genuinely shared behaviour goes in `internal/platform`; nothing else is
shareable.

**The spec is the behaviour.** `services/<name>/openapi.yaml` is the source of
truth. Edit it, then run `make contracts SVC=<name>`. The gateway builds a
fail-closed route registry from every spec at boot, so an endpoint is
unreachable until its spec says who may call it.

**Schema ownership is absolute.** `auth` owns credentials and sessions, `users`
owns profiles, `rbac` owns roles and permissions, and `worker` is the only
writer to `audit`. Cross-schema writes are forbidden; lifecycle rides Redis
Streams.

**Migrations are numbered SQL pairs**, embedded per service with `go:embed`.
`AutoMigrate` is banned, and an applied migration is never edited — add a pair
with `make new-migration SVC=users NAME=add_flag`.

## Conventions that bite

- Conventional Commits, enforced by commitlint. Branch `feat/<topic>` from `main`.
- Generated code and docs belong in the same commit as their source.
- After changing Compose files, env examples, package manifests, or API
  operations, run `node scripts/generate-docs.mjs`.
- UI tests key off accessible names. Keep them.
- `services/_template` is the canonical service shape; `check:architecture`
  flags drift from it.

## About these pages

Pages under `reference/`, plus [curl examples](API_EXAMPLES.md),
[schema audit](API_SCHEMA_AUDIT.md), [data audit](data/AUDIT.md),
[data schema](data/SCHEMA.md), and
[dependency licenses](DEPENDENCY_LICENSES.md), are generated. Edit the source
they are derived from, never the page — CI fails when they drift.

The site is published from `docs/` on `main`. The
[repository README](https://github.com/kochan4php/go-platform-starter#readme)
covers cloning and the quickstart.
