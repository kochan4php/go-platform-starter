# go-platform-starter

Go microservices platform behind a Go gateway, with a React micro-frontend
shell — single Go module, pnpm workspace, spec-first OpenAPI contracts.
Defaults sized for ~100k users. Every deployable ships Dockerfile + thin
Jenkinsfile + compose + k8s manifests with HPA.

```
gateway :8000 ── auth :8081 · users :8082 · rbac :8083 · worker :8084 · realtime :8085
     │
web :5173 ◁ federated ▷ web-auth :5174 · web-admin-users :5175 · web-admin-roles :5176
```

## Quickstart (whole mesh)

```bash
docker compose -f infra/compose.base.yml up --build
```

Boots Postgres + Redis + all six services + the four web apps, migrates every
schema, and seeds the role catalog plus a bootstrap admin.

| URL | What |
| --- | --- |
| http://localhost:5173 | app shell (login → admin) |
| http://localhost:8000/docs | aggregate API reference (Scalar) |
| http://localhost:8000/healthz | edge health |

Seeded admin: `admin@example.local` / `admin-bootstrap-pw`
(the `auth-seed` one-shot prints a random password instead if you remove it).

Observability on top:

```bash
docker compose -f infra/compose.observability.yml --profile obs up
# Grafana http://localhost:3000 · Prometheus http://localhost:9090 · OTLP :4318
```

## Local development

Two toolchains: Go ≥1.27 and Node ≥22 with pnpm 11 (`corepack enable`).
The 30-minute clone-to-PR path lives in [docs/ONBOARDING.md](docs/ONBOARDING.md);
short version:

```bash
go build ./... && go test ./...          # container tests skip without Docker
pnpm install && pnpm contracts && pnpm lint && pnpm test && pnpm build

make run SVC=auth                        # or: make dev SVC=<svc> (air hot-reload)
make contracts SVC=users                 # regenerate stubs after editing openapi.yaml
```

Per-service compose files (`services/<svc>/docker-compose.yml`) give focused
dev loops; `infra/compose.base.yml` is the whole mesh.

## Layout

| Path | Contents |
| --- | --- |
| `services/*` | gateway, auth, users, rbac, realtime, worker (+ `_template`) — each self-contained with spec, migrations, ops files |
| `internal/platform` | shared Go kit: env, logging, tracing, middleware, envelope, pagination, scheduler, mailer, permissions catalog |
| `apps/web*` | federation host + remotes (Vite, React 19, Tailwind v4) |
| `packages/contracts` | generated TS types from the composed OpenAPI + typed fetch wrapper |
| `packages/ui` | design tokens + primitives |
| `infra/` | base & observability compose, Prometheus/Grafana provisioning, Jenkins shared library |
| `docs/` | ARCHITECTURE · SCALING · ONBOARDING · CONTRACTS · SECURITY · API_VERSIONING · QUERY_KEYS · TOKEN_POLICY · MIGRATIONS |
| `bruno/` | API collection covering the full journey |

## Key invariants

1. **Spec-first**: if it isn't in a service's `openapi.yaml`, it doesn't exist;
   generated stubs are committed and CI fails when stale.
2. **Schema-per-service** on one Postgres cluster; cross-service writes are
   forbidden — lifecycle rides Redis Streams (`docs/CONTRACTS.md`).
3. **JWT verified once at the edge**; downstream trusts identity headers bound
   by the internal secret. Access token stays in memory,
   refresh is an httpOnly cookie (`docs/TOKEN_POLICY.md`).
4. **Fail-closed gateway registry**: unknown route = 404; unknown permission =
   boot refusal.
5. **Migrations are numbered SQL pairs**, embedded per service; AutoMigrate is
   banned (`docs/MIGRATIONS.md`).

## CI

PRs run: commitlint · golangci-lint (incl. gosec) · Go tests against real
PG+Redis containers · Biome · Vitest · contract freshness · builds · bundle
budget · import-boundary check · Playwright smoke through a live mesh ·
Trivy + semgrep. Merges feed release automation (`.github/workflows/release.yml`);
per-component image tags come from each thin Jenkinsfile via the shared library.
