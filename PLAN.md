# PLAN — express-ts-starter v3.0.0 "production-grade"

Status: **approved, not started** · Baseline: v2.0.0 overhaul complete (`e534b86..955dcfc`)

Scope confirmed by owner: **all six themes** — config/observability, self-generating docs,
auth completion, CI modernization, real Socket.IO, list ergonomics.
Logging = **pino everywhere** · Mailer = **port + console + SMTP adapter** ·
CI = **GitHub Actions primary, Jenkinsfile stays secondary**.

## Execution contract

- One commit per phase, message prefix `feat(v3)/chore(v3): phase N — ...`
- Every phase gates on: `pnpm typecheck` ✓ · `pnpm lint` (zero errors) ✓ · `pnpm test` (37+ green) ✓
- No phase starts before the previous one is committed

---

## Phase 1 — Fail-fast typed environment

*Foundation for every later phase (mailer/lockout/log vars land here).*

- Rewrite `src/config/env.ts`: single zod schema over **every** environment variable
  (app / db / jwt / ttl / cookie / rate-limit / smtp / lockout / log), parsed once,
  exported as typed constants.
- Missing or invalid env → grouped, human-readable error listing each offending variable,
  then `process.exit(1)`. Misconfig dies at boot, not at first request.
- `src/config/auth.ts` and `src/config/app.ts` consume validated values — zero stray
  `process.env` reads remain outside `config/env.ts`.
- `.env.example` additions: `MAILER_DRIVER`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`,
  `SMTP_PASS`, `SMTP_FROM`, `LOGIN_MAX_ATTEMPTS`, `LOGIN_LOCK_MINUTES`,
  `ADMIN_BOOTSTRAP_PASSWORD`, `LOG_LEVEL`.
- Unit tests: valid env parses to expected types; missing `DATABASE_URL` produces the
  readable failure path.

## Phase 2 — pino everywhere

- `src/common/utils/logger.ts` → pino instance (`LOG_LEVEL`, pretty transport only when
  `NODE_ENV !== 'production'`).
- Request-ID correlation: honor incoming `x-request-id`, otherwise UUID; echo header on
  responses; bind id into every log line via `pino-http` `genReqId`.
- Remove morgan from `src/app.ts`; access logs through pino-http, skipping `/health*`.
- Controllers/services log via child loggers (`req.log`), replacing `logger.error(scope, msg)` calls.
- Dependency swap: remove `npmlog`, `@types/npmlog`, `morgan`, `@types/morgan`;
  add `pino`, `pino-http` (+ `pino-pretty` dev-only).
- New unit test: request-id echoed on response headers.

## Phase 3 — OpenAPI generated from zod (drift killer)

Verified: installed zod 4.4.3 ships native `z.toJSONSchema()` → **no third-party
generator needed**; emit OpenAPI 3.1 directly from DTOs.

- New `src/openapi/registry.ts` (~100 lines): routes register
  `{ path, method, tag, security, body/query/params zod schemas }`; spec assembled at
  boot as OpenAPI 3.1 with components derived per DTO via `z.toJSONSchema`.
- `src/app.ts`: `/docs` (Scalar) + `/docs/openapi.json` serve the generated object —
  the old async-bundle 503 race disappears entirely.
- **Delete** `openapi/*.yaml` and drop `@apidevtools/swagger-parser` dependency.
- All route modules pass their existing DTO schemas to the registry at registration time
  — DTOs become the single source of truth for validation *and* documentation.
- Test: every registered route path appears in the emitted spec; snapshot check for
  spec stability.
- Fallback if Scalar misrenders 3.1: ~20-line conversion shim to 3.0-style output.

## Phase 4 — Auth you can ship

- Migration `002-auth-hardening`: `users.failed_login_attempts INT DEFAULT 0`,
  `users.locked_until TIMESTAMPTZ NULL` (+ matching model fields).
- Login lockout: after `LOGIN_MAX_ATTEMPTS` (default 5) failures set
  `locked_until = now() + LOGIN_LOCK_MINUTES` (default 15); locked logins still return
  uniform 401 (no enumeration); success resets counter.
- Mailer port under `src/common/mailer/`:
  - `IMailer` interface (send(to, subject, html))
  - console transport (default) logs full message content
  - SMTP transport via nodemailer, **lazily imported** so console mode needs no creds;
    selected by `MAILER_DRIVER=console|smtp`.
- Password reset flow:
  - `POST /api/v1/auth/forgot-password` — always 200; emails 15-minute purpose-scoped JWT link
  - `POST /api/v1/auth/reset-password` — verifies token, rehashes password, revokes all
    of that user's sessions
- Bootstrap admin seeder: creates `admin@example.local`; password from
  `ADMIN_BOOTSTRAP_PASSWORD` or randomly generated and printed once to console.
- e2e tests: forgot→reset→login-with-new-password→old-refresh-tokens-dead; lockout matrix
  (N-1 failures OK, Nth locks, reset-after-window works).

## Phase 5 — List ergonomics

- `BaseRepository.paginate(filter, { limit, offset })` via `findAndCountAll`
  returning `{ rows, count }`.
- Standardized list envelope: `{ items, meta: { limit, offset, total } }` applied to
  users and roles list endpoints; shared zod pagination query schema in `common/dto`.
- e2e updated: `meta.total` assertions on both list surfaces.
- Soft-delete: README documents the paranoid-mode pattern **and its unique-index trap**
  (email uniqueness vs soft-deleted rows); deliberately not enabled — documented choice.

## Phase 6 — Socket.IO made real

- `src/modules/realtime/`:
  - handshake auth middleware verifying `auth.token` against the existing access-token
    guard; unauthenticated sockets rejected at connect
  - typed client/server event map (join room, send message, broadcast, error)
  - room-join + broadcast example handler replacing the connect/disconnect-log controller
- Dev dependency `socket.io-client`; one socket e2e test:
  unauthenticated connect rejected → authenticated client joins room → receives broadcast.

## Phase 7 — CI modernization & repo hygiene

- `.github/workflows/ci.yml`: pnpm frozen install → biome → typecheck → vitest
  (ubuntu-latest runners have Docker, testcontainers works as-is) → upload coverage artifact;
  concurrency group cancels superseded runs.
- `renovate.json`: pnpm lockfile maintenance, automerge devDependency minor/patch.
- commitlint (`@commitlint/cli` + config-conventional) wired into husky `commit-msg` hook.
- `.github/PULL_REQUEST_TEMPLATE.md`, `.github/ISSUE_TEMPLATE/{bug.yml,feature.yml}`.
- Jenkinsfile: keep functional, add header note marking GitHub Actions as primary pipeline.
- README: CI badge placeholder, mailer + lockout + pagination docs, realtime section,
  updated architecture tree (openapi registry, mailer, realtime).

---

## Risks & honest caveats

| Risk | Mitigation |
| --- | --- |
| Scalar rendering of OpenAPI 3.1 | Supported today; fallback shim to 3.0 output (~20 lines) |
| GitHub Actions can't run locally | YAML reviewed + suite parity locally; first real push proves it |
| socket.io e2e listener lifecycle in vitest | Known pattern: `app.listen(0)` + address() port inside the spec |
| nodemailer SMTP untestable without server | Adapter covered by interface contract test; real delivery stays out of scope |
| Lockout could enable DoS on known emails | Locks are per-account + timed; uniform responses prevent enumeration feedback |

## Out of scope (deliberate)

- Social/OAuth login providers
- File upload module
- Redis cache/rate-limit store
- i18n error messages
- Monorepo restructuring

## Target definition of done

`pnpm typecheck && pnpm lint && pnpm test:coverage` all green with coverage thresholds met;
`/docs` renders a spec generated purely from code; a fresh clone can go from
`git clone` → registered admin → password-reset email printed to console → paginated
authenticated API calls → authenticated websocket broadcast, following only the README.
