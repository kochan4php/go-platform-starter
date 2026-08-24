# PLAN v5 — express-ts-starter → Go microservices + microfrontend monorepo

Status: **in progress** · Baseline: v3.0.0 complete (`c3561d1`), v4.1 superseded
Progress: **Wave 0 ✅** · Waves 1–7 pending · Legacy TS suite green in `legacy/` (behavioral contract)
Target: **full-Go backend microservices** behind a Go gateway · React micro-frontend shell · pnpm+go.work monorepo · 100k+ user defaults · k8s per-service HPA

---

## 0. The pivot, stated plainly

| | |
| --- | --- |
| **Owner decision** | Microservices instead of shared packages; backend rewritten in Go; monorepo + microfrontends retained |
| **Trade accepted** | Two toolchains (Node for web, Go for services); distributed-systems ops (tracing, retries, contract tests); slower initial velocity |
| **Strategy that makes it safe** | The existing TS implementation + its **59 passing tests are frozen as the behavioral contract**. Every Go endpoint ships with a 1:1 parity test before the TS path is removed |
| **RBAC over the network problem** | Solved by **claims**: auth-svc resolves roles→permissions at login and mints `perms[]` into the JWT. Gateway enforces route→permission locally. Zero per-request RBAC calls; rbac-svc handles management + claim-version bumps |

## 1. Technology decisions

| Concern | Choice | Why |
| --- | --- | --- |
| Language (all services) | **Go ≥1.24** | Owner directive + concurrency for realtime; static binaries, tiny containers |
| HTTP router | `chi` | Idiomatic, stdlib-compatible, middleware ecosystem |
| DB access | `pgx/v5` + **sqlc** (compile-time typed SQL) | Fastest Postgres driver; no reflection ORM at this tier |
| Migrations | `golang-migrate`, **embedded per service** | Each service owns its schema — true service autonomy |
| Data isolation | **Schema-per-service** in one Postgres cluster (`auth`, `users`, `rbac`) | Service autonomy without operating N databases; per-service DB creds scoped to schema |
| Config | `caarlos0/env` + validation | Fail-fast parity with v3's zod env |
| Logging | stdlib **slog** (JSON) | pino-parity structured logs, zero deps |
| JWT | `golang-jwt/jwt/v5` | HS256 now (secret shared via env), RS256 upgrade flag |
| Validation | `go-playground/validator` + binding structs | |
| Cache / locks / queues | Redis 7: `go-redis/v9`, `redis_rate`, **Streams** for job queue | Same Redis serves cache, rate-limit, broker |
| WebSockets | `coder/websocket` + Redis pub/sub fan-out | Go-native from day one (no socket.io interim) |
| Gateway | Go `httputil.ReverseProxy` + JWT middleware + route/permission registry | Template-readable edge; Traefik noted as prod alternative |
| API contracts | Spec-first **OpenAPI per service**; `oapi-codegen` generates server stubs; gateway composes aggregate `/docs/openapi.json`; `openapi-typescript` generates the web client | Contracts stay the single source of truth across languages |
| Tests | stdlib + `testify` + **testcontainers-go**; golden JSON fixtures exported from the TS era | Parity is provable, not aspirational |
| Web (unchanged) | Vite + React 19 + Tailwind v4 + TanStack Query + `vite-plugin-federation` | Remotes: auth, admin-users, admin-roles |
| Lint/format | `golangci-lint` + `gofumpt` (depguard import boundaries per service) | |

## 2. Target layout

```
express-ts-starter/
├── services/
│   ├── gateway/            # edge: JWT verify, permission registry, proxy, aggregate docs, rate limit
│   ├── auth/               # register/login/refresh(rotation+reuse-detect)/reset/lockout/sessions/logout
│   ├── users/              # users CRUD + /me + admin pagination      [schema: users]
│   ├── rbac/               # roles/permissions CRUD + catalog + claim versioning [schema: rbac]
│   ├── realtime/           # Go ws gateway: handshake auth, rooms, broadcast, presence
│   └── worker/             # redis-streams consumer: emails, scrubs, audit flush; cron w/ redis lock
├── internal/               # go workspace shared code (NOT a service)
│   ├── platform/           # slog logger, env loader, middleware (correlation/recover/metrics),
│   │                       #   envelope helpers, jwt claims, errors→HTTP mapping, healthchecks
│   └── testutil/           # testcontainers harness + golden fixture loader
├── apps/
│   └── web/                # MF host + remotes (auth, admin-users, admin-roles)
├── packages/
│   └── contracts/          # generated TS API client (from gateway spec) + shared UI types
├── infra/
│   ├── compose.base.yml    # postgres(scoped schemas/creds) + redis + minio + all services
│   ├── compose.observability.yml   # prometheus + grafana (profile: obs)
│   ├── k8s/                # per-service deployment/svc/hpa (+ realtime custom-metric HPA)
│   └── migrate/            # per-service SQL dirs (embedded via go:embed at build)
├── legacy/                 # frozen TS api kept green until parity ledger completes (then deleted)
└── docs/                   # ARCHITECTURE, SCALING, ONBOARDING, GO_SERVICE→SERVICES.md, ADRs, api-examples
```

**Parity rule:** `legacy/` TS suite stays runnable (its e2e hits the gateway in "compat" mode) until item 78's ledger maps every behavior to a Go test. Nothing is deleted before that.

---

## Wave 0 — Standards & scaffolding (items 1–10)

1. ADR-0004: full-Go microservices pivot; records the trade table above and the parity strategy
2. Monorepo restructure: create `services/*`, `internal/`, `apps/web`, `infra/migrate/*`; move TS api to `legacy/` untouched
3. `go.work` workspace + toolchain pin; root `Makefile`: `make lint build test svc=<name>`
4. `internal/platform`: slog JSON logger (request-id bound), env loader w/ validation, graceful-run server, recover/correlation middleware, standardized `/healthz` `/readyz`
5. Response-envelope helpers emitting byte-identical v3 shapes; golden fixtures captured from TS outputs
6. Error taxonomy port: AppError classes → sentinel errors → status/message mapping table
7. Per-service distroless multi-stage Dockerfile template (~10–15 MB images); compose wiring
8. `golangci-lint` config (gofumpt, depguard service-boundary bans, gosec) + CI Go job
9. `internal/testutil`: testcontainers-go Postgres+Redis harness, golden-fixture loader, parity test helper
10. Spec-first pipeline: per-service `openapi.yaml` → `oapi-codegen` chi stubs; CI validates spec diffs

## Wave 1 — auth service (items 11–24)

11. Embedded migration 001 (schema `auth`): users, sessions — column-for-column with v3 (incl. `failed_login_attempts`, `locked_until`)
12. sqlc queries + repositories; pgx pool sized via env (through-PgBouncer default, DIRECT_URL for migrations)
13. `POST /register` — dup email → 409; bcrypt cost 10 (**same hash format ⇒ legacy password hashes remain valid**)
14. `POST /login` — uniform 401 (unknown/wrong/locked indistinguishable); Redis atomic INCR+EXPIRE lockout, DB columns mirrored for audit
15. `GET /refresh` — rotation with **reuse detection** (session token-family column; replay kills family)
16. Forgot/reset: purpose-scoped 15-min JWT (identical claims format to TS PasswordResetService — golden-tested), reset wipes all sessions
17. Logout + session management (`GET /sessions`, `DELETE /sessions/:id`, `DELETE /sessions`)
18. Mailer port: console + net/smtp transports; sends enqueue onto Redis Streams (worker consumes)
19. Bootstrap-admin seeder CLI (same printed-once-random-password UX)
20. Rate limiting: `redis_rate` per route class (global/auth stricter) — same defaults as v3
21. Login mints claims `{sub,email,perms[],ver}` — `perms[]` fetched from rbac-svc (W2) with cached fallback; `ver` bumps force refresh
22. Full auth openapi.yaml; generated handlers wired; request validation via binding+validator
23. Integration tests: v3 auth e2e cases ported 1:1 (lockout matrix, rotation, reset-kills-sessions, uniformity) — logged into the parity ledger
24. Compose + k8s deployment/service/HPA drafts; healthchecks (db, redis, migrator version)

## Wave 2 — users + rbac services + gateway (items 25–40)

25. users service: schema `users`, CRUD endpoints byte-parity with v3 (envelope, statuses)
26. `GET /me` served from claims (zero cross-service calls)
27. List pagination: identical `{items, meta:{limit,offset,total}}`
28. rbac service: schema `rbac` (roles, permissions, role_permissions, user_roles) + catalog seed command
29. Roles CRUD + permission-sync endpoint parity (unknown permission → 400)
30. `GET /permissions` catalog endpoint
31. Internal claim-resolution API: auth-svc fetches `perms[uid]` (mTLS-less; network-restricted compose/k8s + shared secret headers)
32. Gateway service: chi + ReverseProxy per upstream, strip-hop headers, request timeout budgets
33. Gateway JWT middleware: verify once at the edge; identity headers forwarded downstream (services never re-verify)
34. **Fail-closed route registry**: each service's spec annotates required permission; gateway boots only if every protected route maps to a known permission string (v3 BaseRoute semantics reborn)
35. Aggregate `/docs/openapi.json` composition (paths prefixed per service) + Scalar host at gateway `/docs`
36. Cross-service e2e (gateway→auth/users/rbac): happy paths + 401/403 matrix ported from TS suite
37. Audit-log foundation: `audit_logs` table (schema `audit`), emit-on-mutate middleware, worker flushes batch inserts
38. users + rbac Dockerfiles/compose/k8s drafts; per-service DB creds restricted to own schema
39. Contract generation live: script pulls gateway aggregate spec → `packages/contracts` TS client
40. Parity ledger checkpoint: all v3 users/roles behaviors mapped to passing Go tests

## Wave 3 — realtime service, Go-native (items 41–48)

41. WS upgrade + handshake JWT auth (validates the SAME tokens; golden-token tests shared with TS-era fixtures)
42. Rooms: join/leave/broadcast with v3 event names/payloads (`room:join`, `message:send`, `message`) — protocol doc
43. Room-name allowlist + caps (parity with v3 middleware)
44. Presence + concurrent-connection Prometheus metrics (custom HPA/KEDA target)
45. Redis pub/sub bridge: auth force-logout events kick sockets; future api-origin broadcasts supported
46. Load harness: 10k/50k/100k simulated conns; results into SCALING.md (numbers beat adjectives)
47. Distroless image (~10 MB), k8s deployment + connections-based HPA + PodDisruptionBudget + SIGTERM drain
48. `GET /api/v1/realtime-info` via gateway: ws URL + protocol version for the web client

## Wave 4 — worker service (items 49–55)

49. Redis Streams consumer groups: retries, exponential backoff, DLQ stream
50. Job: transactional-email send (console/smtp transports ported; identical HTML goldens)
51. Scheduled-jobs framework: ticker + redis-lock leader election (single-runner semantics)
52. Jobs: account-deletion PII scrub, audit-buffer flush, expired-session sweeper
53. Metrics: processed/failed/lag gauges; alert-friendly labels
54. Compose + k8s (Deployment, replicas=1 leader + scale-out consumers pattern documented)
55. Chaos drill: kill worker mid-batch → redelivery proves at-least-once + idempotent handlers

## Wave 5 — web microfrontend shell (items 56–69)

56. `apps/web` host scaffold: Vite + React 19 + Tailwind v4 + router + strict TS
57. Federation remotes: `web-auth`, `web-admin-users`, `web-admin-roles` (runtime remote config)
58. Typed client regenerated against **gateway aggregate spec** (`packages/contracts`)
59. `openapi-fetch` wrapper: bearer attach, 401 → silent refresh via gateway cookie, retry-once
60. TanStack Query provider + query-key conventions doc
61. `<RequirePermission perm="user:create:any">` guard reading token claims (UI hint only — gateway enforces truth)
62. `web-auth` remote: login/register/forgot/reset screens (forms mirror zod-era validation rules)
63. `web-admin-users` remote: paginated table (meta.total), create/edit/delete modals
64. `web-admin-roles` remote: role editor + permission sync UI
65. `@starter/ui` primitives + design tokens (Tailwind preset)
66. Vitest + RTL: one meaningful test per remote; MSW mock mode for offline dev
67. Playwright smoke: login → admin table → logout (CI job)
68. Bundle-size budget gate on host build
69. Token storage policy doc: access in memory, refresh httpOnly cookie (matches gateway)

## Wave 6 — Observability & ops (items 70–79)

70. OpenTelemetry SDK in every Go service (OTLP traces); gateway creates parent spans per request
71. Trace IDs injected into slog output; x-request-id ↔ traceparent bridging (v3 continuity)
72. Prometheus `/metrics` per service + provisioned Grafana dashboards (compose `obs` profile)
73. Slow-request (>500ms) + slow-query logging, env-tunable thresholds
74. Central audit-viewer endpoint (admin-gated, paginated)
75. Error-reporter port: no-op default, Sentry adapter optional-by-env
76. SCALING.md: pool sizes, redis memory, HPA triggers, connection-count HPA math, when-to-shard triggers
77. ONBOARDING.md: two-toolchain setup (Node+Go), 30-minute clone-to-PR path
78. ARCHITECTURE.md: mermaid graphs (gateway topology, schemas, streams/topics, federation)
79. Bruno API collection: full journey (register → login → admin CRUD → reset → ws token)

## Wave 7 — Hardening & cutover (items 80–92)

80. Boundary enforcement: depguard rules per service (no cross-service internal imports); web dependency-cruiser rules
81. Security pass: secure-cookie flags by env, CSRF posture for cookie flows, security-headers middleware (helmet parity)
82. `gosec` + trivy image scans + semgrep in CI
83. Perf smoke: autocannon login/list through gateway; compare vs recorded TS numbers (SCALING.md)
84. Resilience drill: kill each service under load → gateway degrades (503 envelope) → recovers cleanly
85. Deprecation-header helper + API versioning policy doc (/api/v1 freeze rules)
86. Idempotency-Key middleware (Redis, 24h replay) on mutating POSTs
87. Cursor-pagination variant for high-churn lists (sessions, audit)
88. Bulk-create example with proper transaction boundaries
89. Legacy cutover: compat-mode off; `legacy/` deleted after ledger reaches 100% (item 78 gate)
90. Root README rewrite (quickstart: `docker compose up` boots the whole mesh)
91. Release engineering: per-service image tags + changesets-style changelog automation
92. v5 DoD checklist executed and signed off in docs

Deferred (explicit non-goals): gRPC between services (REST/OpenAPI suffices at this scale), service mesh, multi-region, sharding, Storybook, i18n framework.

---

## Risks / honest caveats

| Risk | Mitigation |
| --- | --- |
| Rewrite drift (Go ≠ TS behavior) | Frozen TS suite = acceptance contract; 1:1 parity tests + ledger gate cutover |
| Distributed-systems failure modes appear | Gateway timeouts/budgets, resilience drill (84), tracing from day one (70) |
| Schema-per-service still shares a Postgres | Documented stepping stone; creds isolated per schema; extraction path written in ADR |
| Claims staleness after role edits | `ver` claim + forced refresh; permission-cache TTL bounded; admin UI warns |
| Two toolchains onboarding cost | Makefile-driven workflows; ONBOARDING.md; CI does the heavy lifting |
| Velocity dip during Waves 0–2 | Waves gated green + committed; legacy stays deployable throughout |

## Definition of done (v5)

Fresh clone → `docker compose --profile obs up` → register via federated `web-auth` remote → real SMTP email sent through worker → admin edits roles in `web-admin-roles` (typed client, zero hand-written fetch) → websocket broadcast flows through the Go realtime service and survives killing any api pod → Grafana shows per-service metrics → CI green across the Go matrix + web job → parity ledger at 100%, `legacy/` deleted.
