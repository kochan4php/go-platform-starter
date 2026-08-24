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

Not available yet — lands with Wave 0. Target shape:

```bash
make dev SVC=auth          # run one service with watch mode
docker compose -f infra/compose.base.yml up   # or: boot the entire mesh
```

See [PLAN.md](./PLAN.md) for waves, gates and current progress.

## License

Apache-2.0
