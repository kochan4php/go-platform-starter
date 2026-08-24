# Go Platform Starter

> **v6 — Go microservices + microfrontend monorepo. Planning complete, implementation not started.**
> The full wave-by-wave plan lives in [PLAN.md](./PLAN.md).
> A previous TypeScript implementation existed and was removed by owner decision
> (recoverable in git history); the new build is spec-first with no parity contract.

## What this is

A production-shaped starter:

- **Backend** — Go microservices (`chi`, GORM, golang-migrate, slog, JWT + claims-based RBAC,
  Redis Streams, WebSockets) behind a Go gateway that verifies JWTs once and enforces a
  fail-closed route→permission registry
- **Frontend** — React microfrontends (Vite + React 19 + Tailwind v4 + TanStack Query +
  module federation): one host, independently deployable remotes
- **Monorepo** — single root `go.mod` for all services; pnpm workspace for web; service
  isolation enforced by the compiler via `services/<svc>/internal/`
- **Ops** — every service *and* every microfrontend ships its own Dockerfile, Jenkinsfile,
  docker-compose.yml and k8s manifests (Deployment/Service/**HPA**/secret template);
  `infra/compose.base.yml` boots the whole mesh locally

## Layout

```
services/     gateway · auth · users · rbac · realtime · worker   (+ _template)
internal/     platform (shared Go) · testutil (testcontainers)
apps/         web (MF host) · web-auth · web-admin-users · web-admin-roles (remotes)
packages/     contracts (generated TS client) · ui (primitives/tokens)
infra/        compose.base.yml · compose.observability.yml · jenkins/ · k8s/
docs/         ARCHITECTURE · SCALING · ONBOARDING · CONTRACTS · ADRs
```

## Requirements

- Go ≥ 1.27
- Node.js ≥ 22 + pnpm ≥ 10 (`corepack enable`)
- Docker

## Quick start

Wave 0 is in — one template service exists (`services/_template`):

```bash
make env SVC=_template    # create its local .env from the example
make run  SVC=_template   # boots on :8080
curl localhost:8080/healthz localhost:8080/readyz localhost:8080/api/v1/ping
```

Other targets: `make lint|fmt|build|test|cover` · `make dev` (air hot-reload when installed) ·
`make contracts SVC=<name>` regenerates stubs from `services/<name>/openapi.yaml`.
Container-backed tests boot real Postgres+Redis via testcontainers and skip automatically
when Docker isn't running.

See [PLAN.md](./PLAN.md) for waves, gates and current progress.

## License

Apache-2.0
