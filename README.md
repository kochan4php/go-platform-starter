# go-platform-starter

A production-shaped **Go microservices platform** behind a single Go gateway,
with a **React micro-frontend shell** — one Go module, one pnpm workspace,
spec-first OpenAPI contracts. Defaults sized for ~100k users. Every deployable
ships a Dockerfile, a thin Jenkinsfile, docker-compose files and Kubernetes
manifests with HPA.

```
                        ┌──────────────── edge nginx :80/443 ────────────────┐
   browser ────────────►│  /            → web (federation host)              │
                        │  /remote/auth/…→ web-auth · /remote/admin-users/…  │
                        │  /api/v1/… /docs → gateway :8000                   │
                        │  /ws           → gateway → realtime                │
                        └────────────────────────────────────────────────────┘

 gateway (:80 edge / :8010 lab) ──► auth · users · rbac · worker · realtime
                       │            │        │         │
                  Postgres (schema auth/users/rbac/audit)   Redis (cache·streams·pub/sub)
```

## Feature overview

**Backend (Go >= 1.27, chi v5, GORM, Redis 7)**

- **auth** — register/login/logout; refresh tokens with rotation and reuse
  detection (replaying an old refresh token kills the whole session family);
  forgot/reset with single-use jti (GETDEL); Redis atomic lockout mirrored to
  the database; uniform 401 including dummy-hash timing defense on the
  unknown-user path; session management endpoints.
- **users** — profile CRUD plus `/me` served purely from identity headers (zero
  cross-service calls); paginated lists using the shared
  `{items, meta:{limit,offset,total}}` envelope.
- **rbac** — role/permission CRUD with permission sync that bumps the `ver`
  claim of every affected user (forcing token refresh); compile-time
  permission catalog in `internal/platform/permissions`; idempotent seeders
  for the catalog and the bootstrap admin role.
- **gateway** — verifies JWTs once at the edge; fail-closed route registry
  generated from every service's `openapi.yaml` (`x-required-permission`
  annotations, unknown permission refuses boot); CORS, body limit and edge
  rate limiting (redis_rate); aggregated OpenAPI + Scalar UI at `/docs`;
  websocket passthrough at `/ws`.
- **realtime** — WebSocket handshake auth via subprotocol (never a query
  param), rooms with allowlist + capacity, presence gauge, force-logout kicks
  over Redis pub/sub.
- **worker** — Redis Streams consumer groups reading from stream start,
  XAUTOCLAIM redelivery, DLQ after five attempts, idempotent handlers (SETNX
  marker after successful mail send; unique `msg_id` + ON CONFLICT for audit
  flushes), transactional email via the platform mailer port
  (console|smtp), redis-lock scheduled housekeeping.
- **platform kit** (`internal/platform`) — fail-fast env parsing, slog JSON
  logging with request-id + trace-id, trace/metrics/correlation/
  slow-request/security-header/recoverer middleware, response envelope,
  pagination helper, GORM-to-slog bridge with slow-query logging,
  OpenTelemetry OTLP tracing, error-reporter port (noop|Sentry), mailer port,
  redis-lock scheduler.

**Frontend (Vite, React 19, Tailwind v4, TanStack Query)**

- `apps/web` federation host: router, auth context holding the access token in
  memory only, `<RequirePermission>` guard as a UI hint.
- Top-level remotes: `web-auth` (login/register/forgot/reset),
  `web-admin-users` (dashboard overview: dense stat bento, directory table),
  `web-admin-roles` (horizontal accordion role editor with permission sync).
- `packages/contracts`: TypeScript types **generated** from the statically
  composed aggregate spec plus an `openapi-fetch` wrapper (bearer attach,
  401 -> silent refresh -> retry once).
- `packages/ui`: Tailwind v4 design tokens (Cabinet Grotesk on near-black) and
  shared primitives.
- MSW mock mode for offline development; Vitest + RTL per remote; Biome lint
  and format; host bundle-budget gate; workspace import-boundary checker.

**Operations**

- Every deployable: multi-stage Dockerfile (distroless/nginx), thin Jenkinsfile
  via the shared Jenkins library, focused compose file, k8s manifests with HPA,
  `.env.example`.
- Observability compose profile: Prometheus + provisioned Grafana dashboards +
  OpenTelemetry collector.
- CI: commitlint, golangci-lint (incl. gosec), Go tests against real
  Postgres/Redis containers, Biome, Vitest, contract freshness checks, builds,
  bundle budget, import boundaries, Playwright smoke against a live mesh,
  Trivy + semgrep.
- Release automation (release-please) and per-component image tags through each
  thin Jenkinsfile.

---

## Environments

| Environment | Purpose | Stack | Entry point |
| --- | --- | --- | --- |
| **dev** | Daily development with hot reload | native processes (`go run` + vite dev), containers only for Postgres/Redis | `./scripts/dev-all.sh` |
| **lab** | Local integration debugging close to production topology | full docker mesh, all ports published, debug logging, console mailer | `./scripts/deploy-lab.sh` |
| **uat** | Acceptance testing on a VPS | production compose, isolated project/state | `./scripts/deploy-uat.sh` |
| **demo** | Stakeholder-facing playground on a VPS | production compose, console mailer so nothing real is sent | `./scripts/deploy-demo.sh` |
| **prod** | Production VPS deployment | production compose | `./scripts/deploy.sh prod` |

All VPS targets share `infra/compose.prod.yml`; they differ by env file
(`infra/.env.uat`, `.env.demo`, `.env.production`), which isolates container
project names, domains, secrets and data volumes per environment.

### Repository layout

```
go-platform-starter/
├── go.mod                     # SINGLE module — service isolation enforced by the compiler
├── Makefile                   # lint fmt vet build test run dev contracts env
├── package.json               # pnpm root: lint/test/build/e2e/check:budget/check:deps/contracts
├── services/
│   ├── _template/             # blank scaffold — same shape as every other service
│   ├── gateway/               # edge: JWT verify, fail-closed registry, proxy, docs, rate limit
│   ├── auth/                  # credentials & sessions      [schema: auth]
│   ├── users/                 # profiles                    [schema: users]
│   ├── rbac/                  # roles & permissions         [schema: rbac]
│   ├── realtime/              # websocket rooms/presence
│   ├── worker/                # streams consumer            [schema: audit]
│   └── <svc>/
│       ├── openapi.yaml       # SOURCE OF TRUTH for the API (codegen input)
│       ├── codegen.cfg.yaml   # oapi-codegen pinned via go.mod tool directive
│       ├── gen/               # generated stubs — committed; CI fails when stale
│       ├── migrations/        # numbered SQL pairs, embedded (go:embed)
│       ├── internal/          # handlers/repo/services — unimportable by other services
│       ├── Dockerfile · Jenkinsfile · docker-compose.yml · .env.example
│       └── deploy/k8s/{deployment,service,hpa,migrate-job,secret.tpl}.yaml
├── internal/
│   ├── platform/              # shared kit (env, logging, tracing, middleware, envelope,
│   │                          # pagination, scheduler, mailer, permissions catalog…)
│   └── testutil/              # testcontainers-go Postgres+Redis harness
├── apps/
│   ├── web/                   # federation HOST: router + auth context + guards
│   ├── web-auth/              # remote: authentication screens
│   ├── web-admin-users/       # remote: dashboard overview + directory table
│   ├── web-admin-roles/       # remote: role editor (accordion slices)
│   └── <app>/                 # package.json · vite.config.ts · src/ · ops files
├── packages/
│   ├── contracts/             # gen/openapi.json + src/gen.d.ts + typed fetch wrapper
│   └── ui/                    # styles.css (tokens) + React primitives
├── infra/
│   ├── compose.base.yml       # LAB base mesh (postgres/redis/services/apps)
│   ├── compose.lab.yml        # LAB overlay: debug logging, raised rate limits
│   ├── compose.prod.yml       # UAT/DEMO/PROD stack + one-shot migrate/seed jobs
│   ├── .env.*.example         # environment templates (real env files are gitignored)
│   ├── go.env                 # shared dev defaults for compose.base
│   ├── nginx/conf.d/default.conf          # edge nginx, same-origin routing (+ws)
│   ├── nginx/conf.d/edge.tls.conf.template# HTTPS activation template
│   ├── prometheus/ grafana/ otel/         # observability provisioning
│   └── jenkins/vars/          # shared Jenkins library (Go and web pipelines)
├── scripts/
│   ├── deploy.sh              # generic multi-env deployer (lab|uat|demo|prod)
│   ├── deploy-lab.sh          # convenience wrappers, pass flags through
│   ├── deploy-uat.sh · deploy-demo.sh
│   ├── dev-all.sh             # native process orchestrator for daily development
│   ├── e2e-mesh.sh            # disposable mesh runner used by the Playwright job
│   ├── resilience-drill.sh    # kill-under-load drill with assertions
│   ├── perf-smoke/main.go     # dependency-free RPS/latency probe
│   ├── check-budget.mjs       # host bundle-size gate
│   ├── check-deps.mjs         # workspace import-boundary rules
│   └── compose-specs.mjs      # merges services/*/openapi.yaml into the aggregate spec
├── e2e/smoke.spec.ts          # Playwright: login → admin table → logout
├── bruno/                     # API collection covering the full journey
└── docs/                      # ARCHITECTURE CONTRACTS SCALING SECURITY TOKEN_POLICY
                               # QUERY_KEYS API_VERSIONING MIGRATIONS ONBOARDING DOD
```

### Structural rules

1. **Single `go.mod`.** Service isolation is compiler-enforced: code lives under
   `services/<svc>/internal/...`, which Go refuses to let other services import;
   depguard adds explicit bans on top.
2. **Every deployable is self-contained** — its operational files sit next to
   its source; compose files assemble the whole.
3. **Jenkinsfiles stay thin** — pipeline logic lives in the shared library.
4. **Spec-first**: behavior absent from a service's `openapi.yaml` does not
   exist. Generated stubs are committed and CI fails when stale.

### Data ownership and events

| Schema | Owner | Must never hold |
| --- | --- | --- |
| `auth` | credentials + sessions | profile fields |
| `users` | profiles keyed by `sub` | credentials |
| `rbac` | roles / permissions / user_roles | anything else |
| `audit` | append-only trail (**worker-only writer**) | business data |

Cross-schema writes are forbidden; lifecycle rides Redis Streams:

| Stream / event | Producer → consumer |
| --- | --- |
| `users.events:user.created` | auth → users (materialize profile) |
| `users.events:user.deleted` | users → users+auth (delete profile, purge credentials) |
| `mail.jobs:email.send` | auth → worker (SMTP send) |
| `audit.events:audit.entry` | any api service → worker (flush to `audit.audit_logs`) |
| `purge:profiles` (list) | users → users scheduled purge sweep |

Consumer groups start at position `0` so pre-consumer events backfill.
Payload contracts: [docs/CONTRACTS.md](docs/CONTRACTS.md).

---

## Quickstart: the whole lab mesh (docker)

```bash
./scripts/deploy-lab.sh
```

Builds every image, runs migrations, seeds roles + a bootstrap admin, then
starts the stack with all ports published.

| URL | What |
| --- | --- |
| http://localhost:5173 | app shell (login → admin dashboard); same-origin `/api/…` proxy included |
| http://localhost:8010/docs | aggregate API reference (Scalar) |
| http://localhost:8010/healthz | gateway health |
| :8081–:8085 | auth/users/rbac/worker/realtime published for direct debugging |

Seeded admin: `admin@example.local` / `admin-bootstrap-pw`.
Lab container host ports default to non-conflicting values
(`55432` Postgres, `56380` Redis, `8010` gateway) precisely because other
local projects often claim 5432/6379/8000 — override with `LAB_PG_PORT`,
`LAB_REDIS_PORT`, `LAB_GATEWAY_PORT` when needed.

Observability on top:

```bash
docker compose -f infra/compose.observability.yml --profile obs up
# Grafana http://localhost:3000 · Prometheus http://localhost:9090 · OTLP :4318
```

## Daily development: native processes with hot reload

```bash
./scripts/dev-all.sh -d         # start detached
./scripts/dev-all.sh status     # what is running where
./scripts/dev-all.sh logs auth  # tail one component's log
./scripts/dev-all.sh down       # stop everything
```

The script starts Postgres/Redis containers (auto-shifting to ports 55432 /
56380 if another project owns the defaults), compiles and launches all six
services, starts vite dev servers with hot reload, seeds once, and gates on
every health endpoint before reporting ready. Frontend calls resolve to the
gateway via `VITE_GATEWAY_URL` (default `http://localhost:8010`) automatically.

Targeted workflows still work: `make run SVC=auth`, `make dev SVC=users`
(air hot-reload), per-service compose files, `make contracts SVC=<name>`.

## Testing

| Layer | Tooling | Coverage highlights |
| --- | --- | --- |
| Go unit + integration | stdlib testify + testcontainers (real PG/Redis) | lockout matrix, refresh rotation/reuse, reset single-use, worker redelivery/DLQ, audit viewer, gateway e2e incl. 401/403 matrix |
| Web unit | Vitest + RTL (api modules mocked) | permission guard, login flow claims decode, table/modal interactions, accordion listing |
| Smoke E2E | Playwright (real Chromium) | login → admin table → logout through the federated shell |
| Drills | bash scripts | resilience kill-under-load, perf baseline (`scripts/perf-smoke`) |

Run everything locally: `make build test && pnpm lint && pnpm check:deps &&
pnpm test && pnpm build && pnpm check:budget`.

---

# Deployment

## Environments at a glance

| | dev | lab | uat | demo | prod |
| --- | --- | --- | --- | --- | --- |
| Where | your machine | your machine | VPS | VPS | VPS |
| Runtime | native processes | docker compose | docker compose | docker compose | docker compose |
| Hot reload | yes | no | no | no | no |
| Mail | console | console | console default | console | smtp optional |
| Seeds | admin + roles | admin + roles | admin + roles (SEED_ADMIN) | admin + roles | opt-in via SEED_ADMIN |
| Public entry | direct ports | direct ports | edge nginx :80/443 | edge nginx :80/443 | edge nginx :80/443 |

## Deploying UAT or DEMO to a VPS

Prerequisites: an Ubuntu/Debian VPS with ports 80 (and 443 for TLS) reachable;
a DNS record pointing your chosen domain at it; root/sudo.

```bash
git clone https://github.com/kochan4php/go-platform-starter.git
cd go-platform-starter

# first deploy — generates infra/.env.<env> with random secrets
sudo DOMAIN=uat.example.com ./scripts/deploy-uat.sh

# every later update
sudo ./scripts/deploy-uat.sh
```

Same flow for demo: replace the script name (`deploy-demo.sh`) and domain.
What the script performs:

1. installs Docker + the compose plugin when missing (`--install-docker`);
2. fast-forwards the repo to `origin/main` (skip with `--no-pull`);
3. creates `infra/.env.<env>` with `openssl rand -hex 32` secrets (chmod 600)
   on first run — the bootstrap admin password lives there;
4. builds all images cache-aware;
5. runs schema migrations as one-shot jobs BEFORE the rollout;
6. starts the stack behind the edge nginx (single public entry);
7. seeds the role catalog + bootstrap admin (idempotent; disable with
   `SEED_ADMIN=false`);
8. gates on `GET /healthz` through the edge before declaring success.

Rollback: `git checkout <previous-sha> && ./scripts/deploy.sh uat --no-pull`.

### Production

Identical to UAT with stricter defaults:

```bash
sudo DOMAIN=example.com SEED_ADMIN=false ./scripts/deploy.sh prod
```

### Environment variable reference (uat/demo/prod)

| Variable | Required | Purpose |
| --- | --- | --- |
| `STACK_ENV` | auto set by target | isolates compose project name/state per env |
| `DOMAIN` | yes (first run) | public hostname; also the nginx server_name |
| `PUBLIC_WS_URL` | yes | `wss://domain/ws` behind TLS, else `ws://domain/ws` |
| `TRUSTED_DOMAINS` | yes | gateway CORS origins, comma separated |
| `POSTGRES_PASSWORD` | yes | generated by deploy script |
| `ACCESS_TOKEN_SECRET` | yes | >= 32 random chars |
| `INTERNAL_SECRET` | yes | shared secret binding identity headers |
| `LOG_LEVEL` | no | default info; use debug for verbose environments |
| `RATE_GLOBAL_PER_MINUTE` | no | edge rate limit (default 300; lab raises it) |
| `SEED_ADMIN` | no | run the bootstrap-admin seeder during deploy (default true) |
| `ADMIN_EMAIL` / `ADMIN_BOOTSTRAP_PASSWORD` | no | seeded credentials |
| `MAILER_DRIVER` `SMTP_*` `MAIL_FROM` | no | real email delivery |
| `SENTRY_DSN` | no | enables the Sentry error-reporting adapter |

Full templates: `infra/.env.uat.example`, `infra/.env.demo.example`,
`infra/.env.production.example`.

### Enabling HTTPS (uat/demo/prod)

Template: `infra/nginx/conf.d/edge.tls.conf.template`.

1. Issue certificates (e.g. `certbot certonly --standalone -d example.com`).
2. Copy the template to `infra/nginx/conf.d/edge-ssl.conf`, adjust cert paths
   and `server_name`.
3. Uncomment the `443:443` port mapping on the `edge` service in
   `infra/compose.prod.yml` and mount the certificate directory.
4. Switch `PUBLIC_WS_URL` to `wss://…` and redeploy.

### Day-2 operations

```bash
export C="docker compose --env-file infra/.env.uat -f infra/compose.prod.yml"
$C ps                       # status
$C logs -f gateway          # follow one component
$C exec postgres pg_isready # poke the database
$C down                     # stop (named volume survives)
$C down -v                  # WARNING: destroys data

./scripts/resilience-drill.sh   # kill-under-load drill with pass/fail asserts
go run ./scripts/perf-smoke -url http://localhost:8010/healthz -n 2000 -c 20
```

Scaling notes, measured performance baselines and shard triggers:
[docs/SCALING.md](docs/SCALING.md).

---

## Key invariants

1. **Spec-first**: if it is not in a service's `openapi.yaml`, it does not
   exist; generated stubs are committed and CI fails when stale.
2. **Schema-per-service** on one Postgres cluster; cross-service writes are
   forbidden — lifecycle rides Redis Streams.
3. **JWT verified once at the edge**; downstream trusts identity headers bound
   by the internal secret. The access token stays in memory, the refresh token
   is an httpOnly cookie ([docs/TOKEN_POLICY.md](docs/TOKEN_POLICY.md)).
4. **Fail-closed gateway registry**: unknown route = 404; unknown permission =
   boot refusal.
5. **Migrations are numbered SQL pairs**, embedded per service; AutoMigrate is
   banned ([docs/MIGRATIONS.md](docs/MIGRATIONS.md)).

## Documentation index

| Document | Contents |
| --- | --- |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | mermaid diagrams: topology, schemas, streams, federation |
| [docs/CONTRACTS.md](docs/CONTRACTS.md) | spec-first pipeline, envelopes, identity headers, stream payloads |
| [docs/MIGRATIONS.md](docs/MIGRATIONS.md) | numbered-pair convention, expand/contract rule |
| [docs/TOKEN_POLICY.md](docs/TOKEN_POLICY.md) | token storage and silent-refresh flow |
| [docs/QUERY_KEYS.md](docs/QUERY_KEYS.md) | TanStack Query key conventions |
| [docs/SECURITY.md](docs/SECURITY.md) | CSRF posture, security headers, scanning, secrets |
| [docs/API_VERSIONING.md](docs/API_VERSIONING.md) | `/api/v1` freeze rules, RFC-9745 deprecations |
| [docs/SCALING.md](docs/SCALING.md) | pool sizing, HPA math, perf baselines, shard triggers |
| [docs/ONBOARDING.md](docs/ONBOARDING.md) | 30-minute clone-to-PR path, port allocation table |
| [docs/DOD.md](docs/DOD.md) | executed v6 definition-of-done checklist |

Deferred (explicit non-goals): gRPC between services, service mesh,
multi-region, sharding, Storybook, i18n framework, Idempotency-Key middleware,
cursor pagination, PgBouncer (until connection metrics demand it), email
verification flow.
