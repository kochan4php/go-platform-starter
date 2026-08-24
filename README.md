# Go Platform Starter

> **v5 rewrite in progress — Go microservices + microfrontend monorepo.**
> See [PLAN.md](./PLAN.md) for the approved plan and progress.
> The complete, working TypeScript API now lives in [`legacy/`](./legacy) and remains the
> **behavioral acceptance contract** for every Go service (its 59-test suite gates CI).
> Run it: `cd legacy && pnpm setup-app && pnpm docker:db:dev:up && pnpm db:init && pnpm start:local:dev`
> Docs below describe the legacy app until service docs land.

[![CI](https://github.com/kochan4php/go-platform-starter/actions/workflows/ci.yml/badge.svg)](https://github.com/kochan4php/go-platform-starter/actions/workflows/ci.yml)

## Monorepo quick reference (v5)

| What | Where | Command |
| --- | --- | --- |
| Plan / waves / parity ledger | `PLAN.md` | — |
| Go shared platform | `internal/platform` | `go test ./internal/...` |
| Services (Go) | `services/<name>` | `make run SVC=auth` |
| Upgrade ALL Go deps to latest | `go.mod` | `make upgrade` |
| Frozen TS contract suite | `legacy/` | `make legacy.test` |
| Service spec → code pipeline | `docs/CONTRACTS.md` | `make contracts SVC=auth` |

---

[![CI](https://github.com/kochan4php/go-platform-starter/actions/workflows/ci.yml/badge.svg)](https://github.com/kochan4php/go-platform-starter/actions/workflows/ci.yml)

Production-shaped REST + realtime starter: **Express 5 · TypeScript (ESM) · Sequelize (PostgreSQL) · tsyringe DI · Socket.IO · JWT auth with DB-driven RBAC**.

## Features

- Express 5 + TypeScript 7, native ESM (`"type": "module"`, NodeNext)
- **Fail-fast typed env**: one zod schema validates every variable at boot — misconfig dies with a readable report, not a runtime surprise
- PostgreSQL via `sequelize-typescript` decorator models + **umzug migrations**
- JWT access tokens; refresh-token rotation via httpOnly session cookie
- **Auth you can ship**: login lockout, forgot/reset-password with session wipe, bootstrap admin seeder, pluggable mailer (console | SMTP)
- DB-driven RBAC with fail-closed route registration (a route without an explicit access decision refuses to boot)
- **OpenAPI 3.1 generated from the zod DTOs** — served at `/docs` (Scalar) and `/docs/openapi.json`; the spec cannot drift from validation
- Structured logging (**pino**) with request-ID correlation; pretty in dev, JSON in prod
- **Socket.IO realtime**: handshake auth, typed events, room broadcast example
- Standard list envelope `{ items, meta: { limit, offset, total } }` backed by `BaseRepository.paginate()`
- Biome (lint + format), husky pre-commit + commitlint, Renovate
- Vitest suite: unit + e2e against a real Postgres via **testcontainers**, coverage-gated
- Docker multi-stage builds, k8s manifests; GitHub Actions CI (primary) + Jenkins DevSecOps pipeline (secondary)

## Requirements

- Node.js >= 22
- pnpm >= 10 (`corepack enable`)
- Docker (dev database + tests)

## Quick start

```bash
pnpm setup-app          # install deps + generate env files from env/.env.example
# edit env/.env.local — set DATABASE_URL and the three JWT secrets
pnpm docker:db:dev:up   # start local postgres
pnpm db:init            # run migrations + seed (roles/permissions + bootstrap admin)
pnpm start:local:dev    # watch mode on http://localhost:3000
```

The seeder creates `admin@example.local`. Set `ADMIN_BOOTSTRAP_PASSWORD` before seeding,
or grab the randomly-generated password printed once to the seed output.

Interactive docs: http://localhost:3000/docs — API index: http://localhost:3000/api/v1

## Scripts

| Script | Purpose |
| --- | --- |
| `pnpm start:local:dev` | Dev server with watch (env/.env.local) |
| `pnpm build` | Type-check + emit to dist/ |
| `pnpm start:prod` | Run built app (NODE_ENV=production) |
| `pnpm db:init` | Migrate + seed |
| `pnpm db:migrate:undo` | Revert last migration |
| `pnpm test` | Unit + e2e (starts a throwaway Postgres container) |
| `pnpm test:coverage` | Same, with v8 coverage report and thresholds |
| `pnpm lint` / `lint:fix` | Biome check / autofix |
| `pnpm typecheck` | tsc --noEmit |
| `pnpm sast` | Semgrep scan of src/ |

## Environment variables

All live in `env/.env.<NODE_ENV>` and are validated in `src/config/env.ts` (single schema,
fail-fast). See `env/.env.example`; highlights:

| Var | Default | Notes |
| --- | --- | --- |
| `PORT` / `LOG_LEVEL` | `3000` / `info` | |
| `DATABASE_URL` | — | required |
| `DB_POOL_MAX` | `20` | pg pool size |
| `ACCESS_TOKEN_SECRET` / `REFRESH_TOKEN_SECRET` / `SESSION_TOKEN_SECRET` | — | required, min 16 chars |
| `ACCESS_TOKEN_TTL` / `REFRESH_TOKEN_TTL_DAYS` | `5h` / `5` | jsonwebtoken duration format |
| `SESSION_COOKIE_SECURE` / `_SAMESITE` | `false` / `lax` | set SECURE=true behind HTTPS |
| `RATE_LIMIT_*`, `AUTH_RATE_LIMIT_MAX` | `900000/100/10` | global + stricter auth limiter |
| `LOGIN_MAX_ATTEMPTS` / `LOGIN_LOCK_MINUTES` | `5` / `15` | account lockout |
| `MAILER_DRIVER` | `console` | `console` prints emails to stdout; `smtp` uses the values below |
| `SMTP_HOST/_PORT/_USER/_PASS/_FROM` | — | only needed for `smtp` driver |
| `ADMIN_BOOTSTRAP_PASSWORD` | random+printed | seed-time admin password |
| `TRUSTED_DOMAINS` | empty | comma-separated CORS/Socket.IO origins |

## Architecture

```
src/
├── server.ts               # bootstrap: connect DB → health loop → HTTP + socket.io → graceful shutdown
├── app.ts                  # express app: helmet/CSP, pino-http, cors, rate limit, docs, routes, error handler
├── container.ts            # DI composition root (tsyringe)
├── openapi/registry.ts     # OpenAPI 3.1 built from zod DTOs (z.toJSONSchema)
├── config/                 # env.ts = validated env (only file reading process.env), auth/app/http-logger configs
├── database/
│   ├── connection.ts       # sequelize instance + retrying connect
│   ├── models/             # User, Role, Permission, RolePermission, UserRole, Session
│   ├── migrations/         # umzug migrations (register new ones in migrator.ts)
│   ├── seeders/            # roles/permissions catalog + bootstrap admin
│   └── scripts/db.ts       # CLI: pnpm db:init / db:migrate:undo
├── common/
│   ├── base.route.ts       # fail-closed route registration (see RBAC below)
│   ├── base.repository.ts  # generic repository + paginate()
│   ├── rbac/               # decorators, permission catalog/service/middleware, guards
│   ├── mailer/             # IMailer port + console/smtp transports
│   ├── middlewares/        # error handler, zod validation
│   └── utils/              # logger (pino), asyncHandler, hash, jwt helpers
└── modules/
    ├── auth/               # register/login/refresh/logout/forgot/reset + sessions + reset tokens
    ├── users/              # users CRUD + /me
    ├── roles/              # roles CRUD, permission sync, catalog endpoint
    ├── realtime/           # socket.io handshake auth + typed room/broadcast example
    └── core/ · ../health/  # API index · liveness/readiness probes
```

Every response uses one envelope:

```json
{ "success": true, "message": "...", "data": { } }
{ "success": false, "message": "...", "error": "..." }
```

List endpoints standardize on a page shape (`?limit=10&offset=0`, coerced by
`src/common/dto/pagination.ts`):

```json
{ "success": true, "data": { "items": [], "meta": { "limit": 10, "offset": 0, "total": 42 } } }
```

Back it with `BaseRepository.paginate()` (counted `findAndCountAll`) — see users/roles services.

## Soft deletes — pattern and trap

Sequelize supports soft deletes via `paranoid: true` on `@Table` + a `deletedAt` column.
**Trap:** a plain `UNIQUE` constraint on `email` will collide with soft-deleted rows. If you
enable paranoia, move uniqueness to a **partial index** so only live rows count:

```sql
CREATE UNIQUE INDEX users_email_unique ON users (email) WHERE deleted_at IS NULL;
```

This template deliberately ships hard deletes; enable paranoid per model if you need the audit trail.

## RBAC in practice

Permissions are `<resource>:<action>:<scope>` strings defined once in
`src/common/rbac/permission.catalog.ts`. That catalog is the single source of truth:

1. The **seeder** persists it into the `permissions` table and grants everything to `admin`.
2. `BaseRoute` validates at boot that every guarded route references a catalog permission —
   an unknown permission crashes startup instead of shipping a dead route.

Protect a handler in three steps:

```ts
import { Public, Authenticated, RequirePermission } from '../../common/rbac/decorators.js';

@RequirePermission('widget:create:any')   // role must hold this permission (DB-backed)
public async createWidget(req: Request, res: Response) { ... }

@Authenticated()                          // any logged-in user, no permission needed
@Public()                                 // no auth at all
```

Then add `'widget:create:any'` to the catalog and re-run `pnpm db:init`.

> **DI rule:** every constructor injection needs an explicit token —
> `constructor(@inject(UserService) private readonly userService: UserService)` —
> because the esbuild-based dev runner (`tsx`) does not emit decorator metadata.

## Adding an endpoint (docs included, free)

```ts
// modules/widgets/widgets.route.ts
openApiRegistry.register({
    path: '/api/v1/widgets',
    method: 'post',
    tag: 'Widgets',
    summary: 'Create a widget',
    security: 'bearer',
    body: createWidgetSchema.shape.body,   // same zod schema validate() uses
});
this.post('/', [validate(createWidgetSchema)], this.widgetController, 'createWidget');
```

Validation and documentation share the DTO — the spec cannot drift.

## Realtime (Socket.IO)

Clients authenticate during the handshake with an access token:

```ts
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', { auth: { token: accessToken } });

socket.emit('room:join', 'lobby', (res) => console.log(res.joined));
socket.emit('message:send', { room: 'lobby', message: 'hi' });
socket.on('message', (msg) => console.log(msg)); // { room, from, message, at }
```

Event contracts live in `src/modules/realtime/realtime.types.ts`; extend them as you grow.

## Testing

`pnpm test` boots a disposable Postgres container (requires Docker), applies migrations +
seeders **once in global setup**, then exercises the real HTTP surface with supertest and
the socket surface with socket.io-client. Coverage thresholds gate regressions.

## CI & deploy

- **GitHub Actions** (primary): `.github/workflows/ci.yml` — frozen install → biome →
  typecheck → tests with coverage artifact. Renovate keeps dependencies fresh;
  commitlint enforces Conventional Commits.
- `docker compose up` — full stack (app migrates on boot); secrets come from
  `env/.env.production.local` only, never inline.
- `dockerfiles/production/Dockerfile` — multi-stage, frozen lockfile, non-root.
- `k8s/` — deployment/service/hpa/configmap + secret **template** (placeholders only).
- `Jenkinsfile` — secondary, for teams already running Jenkins DevSecOps toolchains.

## License

Apache-2.0
