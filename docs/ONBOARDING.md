# ONBOARDING

Goal: clone → PR in ~30 minutes. Two toolchains (Go ≥1.27, Node ≥22 + pnpm 11).

## 0. Install (5 min)

- Go 1.27+ (`go version`)
- Node 24 + `corepack enable` (ships pnpm)
- Docker Desktop (integration tests + local mesh)
- make (git-bash ships one on Windows; or run the underlying commands directly)

## 1. Clone & verify Go side (10 min)

```bash
go build ./...
go test ./...          # container tests auto-skip if Docker is down
```

Green? You're in. The gate is the same as CI: `gofmt`, `go vet`, golangci-lint,
tests, generated code freshness (`make contracts SVC=_template && git diff --exit-code`).

## 2. Verify web side (10 min)

```bash
pnpm install
pnpm contracts   # regenerate TS types from services/*/openapi.yaml
pnpm lint        # Biome
pnpm test        # Vitest + RTL
pnpm build       # all four apps
pnpm check:budget
```

## 3. Run the whole mesh (5 min)

```bash
docker compose -f infra/compose.base.yml up --build
# seeded admin: admin@example.local / admin-bootstrap-pw
# shell: http://localhost:5173 · docs: http://localhost:8000/docs
```

Observability on top:

```bash
docker compose -f infra/compose.observability.yml --profile obs up
# Grafana http://localhost:3000 · Prometheus http://localhost:9090
```

Focused work instead: every service has its own compose file
(`services/<svc>/docker-compose.yml`) and `make dev SVC=<svc>` hot-reloads it.

## Port allocation table

| Port | Component | Notes |
| --- | --- | --- |
| 3000 | Grafana | obs profile |
| 4318 | OTel collector (OTLP/HTTP) | obs profile |
| 5173 | apps/web (host) | vite preview in e2e; nginx in compose |
| 5174 | apps/web-auth remote | |
| 5175 | apps/web-admin-users remote | |
| 5176 | apps/web-admin-roles remote | |
| 5432 | Postgres (per-service compose) | mesh uses internal network |
| 55432 | Postgres (e2e-mesh script) | host-mapped to avoid clashes |
| 56379 | Redis (e2e-mesh script) | idem |
| 6379 | Redis (per-service compose) | |
| 8000 | gateway | public edge |
| 8081 | auth | |
| 8082 | users | |
| 8083 | rbac (+ `/rbac/internal/*` never exposed via gateway) | |
| 8084 | worker (probes, metrics, audit viewer) | |
| 8085 | realtime (REST bits) | WS upgrade at `/api/v1/realtime/ws` via gateway |

## 4. Make a PR (5 min)

- Conventional commits enforced (`feat(scope): ...`) — commitlint runs in CI.
- New column ⇒ new numbered migration pair (`docs/MIGRATIONS.md`); AutoMigrate is banned.
- API change ⇒ edit `services/<svc>/openapi.yaml` first, then
  `make contracts SVC=<svc>`; CI fails on stale stubs.
- Web API calls go through `@starter/contracts` only — no hand-written fetch.
