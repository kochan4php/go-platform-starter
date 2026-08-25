# PLAN v6 — go-platform-starter → Go microservices + microfrontend monorepo (fresh build)

Status: **in progress** · Supersedes PLAN v5 and all pre-wipe docs/ADRs
Baseline: repo wiped clean by owner decision (2026-08-24); only this plan, the README and LICENSE remain. All prior code recoverable in git history.
Target: **full-Go backend microservices** behind a Go gateway · React micro-frontend shell · pnpm + single-module Go monorepo · **every deployable ships Dockerfile + Jenkinsfile + compose + k8s HPA** · defaults sized for ~100k users.

## Progress

| Wave | Status | Evidence |
| --- | --- | --- |
| 0 | ✅ done 2026-08-24 | `d412fac` — platform package, template service, scaffold; gate green (fmt/vet/build/test incl real containers, boot smoke) |
| 1 | ✅ done 2026-08-24 | auth service: spec-first (register/login/refresh-rotation+reuse-detect/forgot/reset/sessions/logout), bcrypt, Redis lockout mirrored to DB, uniform-401 + dummy-hash timing defense, single-use reset jti via GETDEL, streams publisher (`user.created`, mail jobs), bootstrap seeder w/ fixed sub, embedded golang-migrate (-migrate/-seed flags), strict/global redis_rate classes fail-open, k8s/compose/Jenkinsfile/Dockerfile ops set; 5/5 integration tests green vs real PG+Redis |
| 2 | ✅ done 2026-08-24 | users (profile CRUD, /me dari identity headers, stream consumer backfill) + rbac (roles/permissions CRUD, permission-sync→ver bump, katalog statis di platform, seed admin) + gateway (JWT verify sekali di edge, fail-closed registry dari `x-required-permission`, CORS/body-limit/edge rate-limit, aggregate docs + Scalar) + audit emit-side + cmd/composespec → packages/contracts; **e2e full-mesh PASS** (register→login→admin CRUD lewat gateway + 401/403 matrix) — MVP checkpoint tercapai |
| 3 | ✅ done 2026-08-24 | realtime service: WS handshake JWT via subprotocol (bukan query param), room join/leave/broadcast dengan allowlist+cap, presence gauge `realtime_connections`, Redis pub/sub force-logout kick, ops files lengkap; integration test 2-client broadcast + deny + kick PASS vs Redis asli |
| 4 | ✅ done 2026-08-25 | worker service: consumer groups `mail.jobs`+`audit.events` mulai dari `0`, XAUTOCLAIM reclaim + DLQ setelah 5 attempt, handler idempotent (marker SETNX pasca-send utk email; `msg_id` unique + ON CONFLICT utk audit flush), kirim email via platform mailer; platform.Scheduler di-wire: auth session-sweep + users profile-purge (list `purge:profiles`); metrics processed/lag; ops files lengkap; chaos drill test (crash mid-batch → redeliver exactly-once, poison job → DLQ) PASS vs PG+Redis asli. Bonus review-fix: PDB realtime (item 47), Jenkins lib skip codegen utk service tanpa spec-codegen, CONTRACTS.md payload contracts stream |
| 5 | ⏳ | |
| 6–7 | pending | |

---

## 0. The pivot, stated plainly

| | |
| --- | --- |
| **Owner decisions** | Microservices over shared packages; backend rewritten in Go; monorepo with microfrontends; clean slate — legacy TS app **deleted, not frozen**; per-component ops files everywhere; ORM = GORM |
| **Parity contract removed** | v5's strategy (frozen TS suite as behavioral contract, golden fixtures, compat-mode gateway, parity ledger gate) died with `legacy/`. Replaced by **spec-first**: each service's `openapi.yaml` is the single contract; tests assert against spec + pinned envelope shapes. Behavioral regressions vs the old TS API are accepted and documented — no production consumers depend on it |
| **Trade accepted** | Two toolchains (Node for web, Go for services); distributed-systems ops (tracing, timeouts, retries); reflection-ORM overhead of GORM accepted for development velocity |
| **RBAC over the network problem** | Solved by claims: auth-svc resolves roles→permissions at login and mints `perms[]` into the JWT. Gateway enforces route→permission locally. Zero per-request RBAC calls; rbac-svc handles management + claim-version bumps |

## 1. Technology decisions

| Concern | Choice | Why / rules |
| --- | --- | --- |
| Language (all services) | **Go ≥1.27** | Owner directive + concurrency for realtime; static binaries, tiny containers |
| HTTP router | `chi/v5` | Idiomatic, stdlib-compatible, middleware ecosystem |
| DB access | **GORM** (`gorm.io/gorm` + `gorm.io/driver/postgres`) | Velocity + ecosystem (hooks, preload). Reflection trade recorded in ADR-0001. Thin repositories on top; envelope/pagination helpers stay shared |
| Migrations | **`golang-migrate`, embedded per service** (`go:embed`) | Migration files are the source of truth everywhere. **AutoMigrate is banned** — dev included. New column ⇒ new numbered up/down SQL pair |
| Zero-downtime schema rule | **Expand/contract** | Under multi-replica rolling deploys old+new pods coexist: add nullable → deploy code using it → only then `SET NOT NULL`. Never one-shot breaking DDL |
| Data isolation | **Schema-per-service** on one Postgres cluster (`auth`, `users`, `rbac`, `audit`) | Per-service DB creds scoped to own schema; extraction path documented in ADR-0001 |
| Data migration from old app | **None — N/A** | Fresh schemas; starter has no production data |
| Config | `caarlos0/env` + validation | Fail-fast at boot |
| Logging | stdlib **slog** (JSON), request-id bound | GORM's logger is **bridged into slog** so slow-query logging works uniformly |
| JWT | `golang-jwt/jwt/v5` | HS256 now (secret via env), RS256 upgrade flag later |
| Validation | `go-playground/validator` + binding structs | |
| Cache / locks / queues | Redis 7: `go-redis/v9`, `redis_rate`, **Streams** for jobs | Same Redis serves cache, rate-limit, broker |
| WebSockets | `coder/websocket` + Redis pub/sub fan-out | Go-native from day one |
| Gateway | `httputil.ReverseProxy` + JWT middleware + fail-closed route registry; **gateway owns CORS/TRUSTED_DOMAINS** | Services behind it never think about origins. Traefik noted as prod alternative |
| API contracts | Spec-first **OpenAPI per service**; `oapi-codegen` generates chi server stubs — **pinned via Go `tool` directive** (no `@latest`) | Each service serves its embedded spec at `GET /openapi.json`; gateway fetches upstreams at boot and composes aggregate `/docs/openapi.json` + Scalar host |
| Web client types | `openapi-typescript` against the aggregate spec composed statically from `services/*/openapi.yaml` → `packages/contracts` | Generated only — never hand-edited |
| Tests | stdlib + `testify` + **testcontainers-go** (PG+Redis) | Assert against openapi spec + envelope helpers. No golden fixtures (nothing to be golden against) |
| Web | Vite + React 19 + Tailwind v4 + TanStack Query + `vite-plugin-federation` | Remotes are top-level `apps/web-*` — independent build & deploy |
| Lint/format | `golangci-lint` + `gofumpt`; depguard import boundaries | Isolation is compiler-enforced first (see §2), lint is belt-and-suspenders |
| Web lint/format | **Biome** (lint + format) for all `apps/*` + `packages/*` | Wired in the Wave 5 scaffold; runs in the CI web job |
| CI/CD | **Jenkinsfile per component** (thin — calls vars from the `infra/jenkins` Shared Library) + root GitHub Actions workflow for PR gates (lint/test) | Jenkins promoted from "secondary" to primary delivery pipeline |

## 2. Target layout

```
go-platform-starter/
├── go.mod                      # SINGLE module — no go.work
├── Makefile                    # make lint|fmt|build|test|run|dev SVC=<name> · make contracts SVC=<name> · make env
├── services/                   # EVERY service ships its own ops files — see auth/ expanded below
│   ├── _template/              # blank scaffold for a new service — same shape as auth/
│   ├── gateway/                # edge: JWT verify, permission registry, proxy, CORS,
│   │                           #   aggregate docs, rate limit, request budgets (ops files same as auth/)
│   ├── auth/                   # register/login/refresh(rotation+reuse-detect)/reset/lockout/sessions/logout
│   │   ├── main.go
│   │   ├── openapi.yaml        # spec = source of truth (codegen input)
│   │   ├── codegen.cfg.yaml
│   │   ├── gen/                # oapi-codegen output
│   │   ├── migrations/         # embedded numbered up/down SQL pairs (schema: auth)
│   │   ├── internal/           # handlers/repo/services — compiler-isolated from other services
│   │   ├── Dockerfile          # distroless multi-stage (~10–15 MB)
│   │   ├── Jenkinsfile         # thin — calls vars from the infra/jenkins Shared Library
│   │   ├── docker-compose.yml  # this service + its deps only (focused local dev)
│   │   └── deploy/k8s/         # deployment.yaml · service.yaml · hpa.yaml · migrate-job.yaml · secret.tpl.yaml
│   ├── users/                  # same structure as auth/ — CRUD + /me + pagination [schema: users]
│   ├── rbac/                   # same structure as auth/ — roles/permissions CRUD + claim versioning [schema: rbac]
│   ├── realtime/               # same structure as auth/ — ws rooms/broadcast/presence (+ PodDisruptionBudget)
│   └── worker/                 # same structure as auth/ — redis-streams consumer: email sends, audit flush
├── internal/                   # shared Go code (NOT a service)
│   ├── platform/               # slog logger, env loader, middleware (correlation/recover/metrics),
│   │                           #   envelope helpers, jwt claims, errors→HTTP mapping, healthchecks,
│   │                           #   gorm→slog bridge, pagination helper ({items, meta:{limit,offset,total}}),
│   │                           #   redis-lock scheduler, mailer port, permission catalog (platform/permissions)
│   └── testutil/               # testcontainers-go Postgres+Redis harness
├── apps/                       # microfrontends — remotes are TOP-LEVEL, independently buildable/deployable
│   │                           # EVERY app ships its own ops files (no secret.tpl — static sites hold no secrets)
│   ├── web/                    # MF host: shell, router, auth context
│   │   ├── src/ · package.json · vite.config.ts · federation remote config
│   │   └── Dockerfile · Jenkinsfile · docker-compose.yml · deploy/k8s/{deployment,service,hpa}.yaml
│   ├── web-auth/               # same structure as web/ — login/register/forgot/reset
│   ├── web-admin-users/        # same structure as web/ — users table + modals
│   └── web-admin-roles/        # same structure as web/ — role editor + permission sync
├── packages/
│   ├── contracts/              # generated TS client (from statically composed aggregate spec)
│   └── ui/                     # @starter/ui primitives + Tailwind preset/tokens
├── infra/
│   ├── compose.base.yml        # full mesh local dev: postgres(scoped schemas/creds)+redis+all services+apps
│   ├── compose.observability.yml # prometheus + grafana (profile: obs)
│   ├── jenkins/                # shared library consumed by every component's thin Jenkinsfile
│   └── k8s/                    # shared: namespace, ingress, monitoring addons
└── docs/                       # ARCHITECTURE, SCALING, ONBOARDING, CONTRACTS, COVERAGE, ADRs
```

### Structural rules

1. **Single root `go.mod`.** Service isolation is enforced by the compiler: service code lives in
   `services/<svc>/internal/…`, which Go refuses to let other services import. depguard adds
   explicit bans on top.
2. **Every deployable is self-contained**: its Dockerfile, thin Jenkinsfile, compose file and
   `deploy/k8s/` manifests live next to its source. `infra/compose.base.yml` composes them all
   for one-command mesh startup (onboarding/e2e); per-service compose files exist for focused work.
3. **Jenkinsfiles stay thin** — `infra/jenkins/` is registered as a Jenkins Shared Library; every Jenkinsfile calls its vars with the component name as parameter. No copy-pasted pipeline logic across ~10 components.
4. **HPA defaults**: CPU/memory requests-based for api services; realtime gets a custom
   connections-based metric target; every Deployment ships a matching HPA manifest.

---

## Wave 0 — Standards & scaffolding (items 1–8)

Gate: fresh clone runs `make lint build test` green; template service boots with health endpoints.

1. ADR-0001 (fresh numbering — old ADRs died with the wipe): records the full pivot — Go microservices + microfrontend monorepo, GORM over sqlc, spec-first without parity contract, ops files per component
2. Scaffold: root `go.mod` (toolchain pin), `Makefile` targets (`lint fmt build test run dev contracts env`), minimal GitHub Actions PR workflow, `pnpm-workspace.yaml` covering `apps/*` + `packages/*` — explicitly **no turborepo/nx**; Renovate config covering both toolchains; `.env.example` per deployable + `make env` bootstraps local env files; conventional commits enforced in CI (commitlint)
3. `internal/platform`: slog JSON logger (request-id bound), fail-fast env loader, graceful-run server, recover/correlation middleware, `/healthz` `/readyz`, response-envelope helpers, error taxonomy (sentinel errors → status/message mapping), pagination helper, GORM→slog bridge, Prometheus `/metrics` middleware, redis-lock scheduler (single-runner housekeeping, consumed by item 51), mailer port (console | smtp transports — shared because auth enqueues while the worker sends)
4. `internal/testutil`: testcontainers-go Postgres+Redis harness
5. `services/_template`: full scaffold incl. distroless multi-stage Dockerfile (~10–15 MB), thin Jenkinsfile pattern, compose snippet, k8s deployment/service/hpa/migrate-job/secret-template manifests; **`infra/jenkins/` shared library is created here too** (consumed per rule 3)
6. Codegen pipeline: oapi-codegen pinned via `go tool` directive; `make contracts SVC=<name>` regenerates stubs; CI fails on stale generated code; `docs/CONTRACTS.md` documents the pipeline (spec rules, shared envelope schemas, identity-header contract, data-split contract, stream-event payload contracts)
7. `golangci-lint` config: gofumpt, depguard boundary bans, gosec
8. Migration convention doc: numbered up/down pairs per service, embedded; AutoMigrate banned everywhere; expand/contract rule for zero-downtime. **Execution model:** k8s Job runs migrate+seed before each rollout — pods only *verify* the applied version in readyz (no migrate race between replicas on scale-out); boot-time migrate remains for compose/dev

## Wave 1 — auth service (items 9–22)

Gate: auth passes its integration suite through its compose stack; ops files complete; CI green.

9. Embedded migration 001 (schema `auth`): users (**credentials only** — email, password_hash, status, lockout columns), sessions. Profile data lives in the users service's schema, never here (see item 23)
10. GORM models + repositories; pool sized via env (direct Postgres pool — **PgBouncer deferred** until connection metrics demand it)
11. `POST /register` — dup email → 409; bcrypt cost 10; emits `user.created` onto Redis Streams (consumed by the users service, item 23)
12. `POST /login` — uniform 401 (unknown/wrong/locked indistinguishable — including timing, via dummy-hash compare on the unknown-user path); Redis atomic INCR+EXPIRE lockout mirrored to DB columns for audit
13. `POST /refresh` — rotation with reuse detection (session token-family column; replay kills family). POST, not GET — rotation mutates session state (the old TS verb was a parity-era fossil, gone with the contract)
14. Forgot/reset: purpose-scoped 15-min JWT, **single-use** (jti consumed on successful reset); forgot responds uniformly whether or not the account exists (anti-enumeration); reset wipes all sessions
15. Logout + session management (`GET /sessions`, `DELETE /sessions/:id`, `DELETE /sessions`)
16. Auth only **enqueues** transactional-email jobs onto Redis Streams (payload contract in CONTRACTS.md); rendering + sending happen in the worker — the mailer port and console/smtp transports live in `internal/platform`, never inside auth (compiler isolation)
17. Bootstrap-admin **credentials** seeder (random password printed once) — writes only the `auth.users` row using a fixed bootstrap `sub` constant from `internal/platform`, then emits `user.created` so the users service materializes the admin's profile row too; role assignment happens in Wave 2 (item 26), keeping single-schema write discipline
18. Rate limiting: `redis_rate` per route class (global/auth stricter); Redis-outage posture pinned here once: limiters AND lockout degrade **fail-open** — availability over brute-force hardening, window bounded by bcrypt cost (revisit if that balance ever changes)
19. Login mints claims `{sub,email,ver}` — **without `perms[]` until Wave 2 lands rbac**; claim shape reserved so minting perms later is additive
20. Full auth `openapi.yaml`; generated handlers wired; validation via binding structs + validator
21. Integration tests against spec + envelope (lockout matrix, rotation, reset-kills-sessions, uniformity) via testcontainers harness
22. Ops files complete: Dockerfile, Jenkinsfile, docker-compose.yml, deploy/k8s/{deployment,service,hpa,migrate-job,secret.tpl}.yaml

## Wave 2 — users + rbac services + gateway (items 23–40)

Gate: register→login→admin CRUD works end-to-end through gateway. **⭐ MVP checkpoint — platform usable here; Waves 3–7 are enhancements.**

23. users service: schema `users` holds **profile data only** (display name, avatar…) keyed by `sub`. Data-split contract (auth=credentials / users=profile) documented in CONTRACTS.md. Lifecycle rides Redis Streams: consumes `user.created` → materializes profile row; consumes `user.deleted` → hard-deletes the profile row (auth likewise purges credentials+sessions on the same event). Consumer groups read from stream start (`0`) so registrations made before this wave backfill
24. `GET /me` served purely from claims (zero cross-service calls)
25. List pagination identical `{items, meta:{limit,offset,total}}` via shared helper
26. rbac service: schema `rbac` (roles, permissions, role_permissions, user_roles) + seed command that loads the static catalog (`internal/platform/permissions`, introduced here together with item 33's registry) and assigns the admin role to the bootstrap `sub`
27. Roles CRUD + permission-sync endpoint (unknown permission → 400); role/permission edits bump affected users' `ver` (fulfills the §0 claim-version responsibility and drives forced refresh)
28. `GET /permissions` catalog endpoint
29. Internal claim-resolution API: auth-svc fetches `perms[uid]` (network-restricted compose/k8s + shared secret headers)
30. Auth upgrade: login now mints `perms[]` + `ver` into access tokens (additive to item 19's shape)
31. Gateway service: chi + ReverseProxy per upstream, strip hop-by-hop headers, per-route timeout budgets, **CORS/TRUSTED_DOMAINS + request body size limit + edge-global rate limit (redis_rate) enforced here**
32. Gateway JWT middleware: verify once at the edge; forwards `X-User-Id`, `X-Email` + the original Authorization downstream (header contract documented in CONTRACTS.md; claims are not copied into ad-hoc headers to bound header size); services never re-verify, but DO reject identity headers missing the shared internal-secret header from item 29 — a leaked network position alone grants nothing
33. Fail-closed route registry: specs annotate `x-required-permission`; the permission catalog lives statically in `internal/platform/permissions` — imported by the rbac seeder AND gateway boot validation, so "known" means compile-time catalog with zero DB hop at boot
34. Aggregate docs: each service serves embedded `/openapi.json`; gateway fetches upstreams at boot → composed `/docs/openapi.json` + Scalar UI at `/docs` — served as one static HTML page loading Scalar's CDN bundle pointed at the aggregate spec (zero extra Go deps)
35. Cross-service e2e (gateway→auth/users/rbac): happy paths + 401/403 matrix
36. Audit-log foundation: `audit_logs` table (schema `audit`); services only **emit events onto Redis Streams** (keeps single-schema creds rule intact), worker is the sole table writer flushing batches (Wave 4)
37. Contracts generation live: aggregate spec composed **statically from `services/*/openapi.yaml`** at build time → `packages/contracts` TS client; gateway serves the identical composition at runtime (frontend builds never need a live mesh)
38. Ops files for users, rbac, gateway (same set as item 22)
39. MVP smoke path documented in README quickstart draft
40. Per-wave ledger: endpoint coverage checklist per service committed to `docs/` (spec ↔ test ↔ status)

## Wave 3 — realtime service (items 41–48)

Gate: two clients exchange messages through the ws service; force-logout kicks sockets; HPA manifests present.

41. WS upgrade + handshake JWT auth (same tokens as REST; token travels in the handshake header/subprotocol — never a query param, which leaks into access logs)
42. Rooms: join/leave/broadcast with documented event names/payloads (`room:join`, `message:send`, `message`)
43. Room-name allowlist + caps
44. Presence + concurrent-connection Prometheus metrics (custom-metric HPA/KEDA target)
45. Redis pub/sub bridge: auth force-logout events kick sockets; future api-origin broadcasts supported
46. Load harness: 10k/50k/100k simulated conns; results into SCALING.md
47. Ops files: distroless image (~10 MB), deployment + connections-based HPA + PodDisruptionBudget + SIGTERM drain
48. `GET /api/v1/realtime-info` via gateway: ws URL + protocol version for the web client

## Wave 4 — worker service (items 49–55)

Gate: kill worker mid-batch → redelivery proves at-least-once with idempotent handlers.

49. Redis Streams consumer groups: retries, exponential backoff, DLQ stream; groups start at stream begin (`0`) so mail queued during Waves 1–3 drains on first boot
50. Job: transactional-email send via the platform mailer (enqueue/split per item 16)
51. Scheduled-jobs framework — ticker + redis-lock leader election (single-runner semantics) — lives in `internal/platform` so ANY service can run its own housekeeping without cross-schema writes
52. Jobs owned by the worker (audit-schema creds only): audit-buffer flush (feeds item 36). Schema-touching housekeeping runs in the owning service via the platform scheduler instead: expired-session sweeper in auth, profile purge in users — zero cross-schema writes anywhere
53. Metrics: processed/failed/lag gauges; alert-friendly labels
54. Ops files: Deployment (replicas=1 leader + scale-out consumer pattern documented), compose, k8s+HPA
55. Chaos drill: kill worker mid-batch → redelivery proves at-least-once + idempotent handlers

## Wave 5 — web microfrontend shell (items 56–69)

Gate: login → admin table → logout Playwright smoke green in CI against the federated shell.

56. `apps/web` host scaffold: Vite + React 19 + Tailwind v4 + router + strict TS + Biome lint/format + pinned node/pnpm engines; CI web job wired here (Biome + Vitest, Playwright joins at item 67); host ships its own Dockerfile/Jenkinsfile/compose/k8s set
57. Federation remotes `web-auth`, `web-admin-users`, `web-admin-roles` — each a top-level `apps/web-*` package with runtime remote config + full ops-file set (static build served via nginx image)
58. Typed client regenerated against the statically composed aggregate spec (`packages/contracts`)
59. `openapi-fetch` wrapper: bearer attach, 401 → silent refresh via gateway cookie, retry-once
60. TanStack Query provider + query-key conventions doc
61. `<RequirePermission perm="user:create:any">` guard reading token claims (UI hint only — gateway enforces truth)
62. `web-auth` remote: login/register/forgot/reset screens
63. `web-admin-users` remote: paginated table (meta.total), create/edit/delete modals
64. `web-admin-roles` remote: role editor + permission sync UI
65. `@starter/ui` primitives + design tokens (Tailwind preset) in `packages/ui`
66. Vitest + RTL: one meaningful test per remote; MSW mock mode for offline dev
67. Playwright smoke: login → admin table → logout (CI job)
68. Bundle-size budget gate on host build
69. Token storage policy doc: access in memory, refresh httpOnly cookie (matches gateway)

## Wave 6 — Observability & ops (items 70–79)

Gate: Grafana shows per-service metrics; a slow query appears in slog with trace id.

70. OpenTelemetry SDK in every Go service (OTLP traces); gateway creates parent spans per request
71. Trace IDs injected into slog output; x-request-id ↔ traceparent bridging
72. Prometheus `/metrics` per service + provisioned Grafana dashboards (compose `obs` profile)
73. Slow-request (>500ms) + slow-query logging via the GORM→slog bridge, env-tunable thresholds
74. Central audit-viewer endpoint hosted by the worker (the only holder of audit-schema creds), exposed via a gateway route guarded by an admin permission, paginated
75. Error-reporter port: no-op default, Sentry adapter optional-by-env
76. SCALING.md: pool sizes, redis memory, HPA triggers, connection-count HPA math, when-to-shard triggers
77. ONBOARDING.md: two-toolchain setup (Node+Go), 30-minute clone-to-PR path, port-allocation table for all local components
78. ARCHITECTURE.md: mermaid graphs (gateway topology, schemas, streams/topics, federation)
79. Bruno API collection: full journey (register → login → admin CRUD → reset → ws token)

## Wave 7 — Hardening (items 80–88)

Gate: v6 DoD checklist executed and signed off in docs.

80. Boundary enforcement: depguard rules per service verified in CI; web dependency-cruiser rules
81. Security pass: secure-cookie flags by env, CSRF posture for cookie flows, security-headers middleware (helmet parity)
82. `gosec` + trivy image scans + semgrep in CI
83. Perf smoke baseline through gateway → recorded numbers in SCALING.md
84. Resilience drill: kill each service — plus Postgres and Redis — under load → gateway degrades (503 envelope) → recovers cleanly
85. Deprecation-header helper + API versioning policy doc (/api/v1 freeze rules)
86. Root README final rewrite (quickstart: `docker compose up` boots the whole mesh)
87. Release engineering: per-component image tags + changelog automation
88. v6 DoD checklist executed and signed off

Deferred (explicit non-goals): gRPC between services (REST/OpenAPI suffices), service mesh, multi-region, sharding, Storybook, i18n framework, Idempotency-Key middleware, cursor-pagination variant, bulk-create example, PgBouncer (until connection metrics demand it), email-verification flow.

---

## Risks / honest caveats

| Risk | Mitigation |
| --- | --- |
| No behavioral contract vs old TS API (deleted) | Accepted by owner. Spec-first + pinned envelope shapes keep the *new* surface honest; regressions vs v3 are possible and tolerated |
| Distributed-systems failure modes appear | Gateway timeout budgets, resilience drill (84), tracing from day one (70) |
| Schema-per-service still shares a Postgres | Documented stepping stone; creds scoped per schema; extraction path written in ADR-0001 |
| Email existence leaks: register returns 409 on dup | Accepted starter trade for admin UX; revisit alongside email verification (deferred) |
| Single Redis is a shared SPoF — cache, lockout counters, Streams queue, ws pub/sub all die together | Persistence (AOF) + documented restart/recovery posture; Sentinel/cluster deferred until uptime demands it |
| Claims staleness after role edits | `ver` claim + forced refresh; permission-cache TTL bounded; admin UI warns |
| Two toolchains onboarding cost | Makefile-driven workflows; ONBOARDING.md; CI does the heavy lifting |
| GORM reflection overhead / N+1 temptation | Thin repositories, slow-query logging (73) makes misuse visible; escape hatch to raw SQL stays available |
| Velocity dip during Waves 0–2 | MVP checkpoint after Wave 2 keeps scope honest and dogfooding early |

## Definition of done (v6)

Fresh clone → `docker compose --profile obs up` → register via federated `web-auth` remote → real SMTP email sent through worker → admin edits roles in `web-admin-roles` (typed client, zero hand-written fetch) → websocket broadcast flows through the Go realtime service and survives killing any api pod → Grafana shows per-service metrics → **every service and microfrontend has Dockerfile + Jenkinsfile + compose + k8s manifests with HPA** → CI green across the Go job + web job.
