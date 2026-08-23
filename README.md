# Express TS Starter

Production-shaped REST API starter: **Express 5 · TypeScript (ESM) · Sequelize (PostgreSQL) · tsyringe DI · Socket.IO · JWT auth with DB-driven RBAC**.

## Features

- Express 5 + TypeScript 7, native ESM (`"type": "module"`, NodeNext)
- PostgreSQL via `sequelize-typescript` decorator models + **umzug migrations**
- JWT access tokens; refresh-token rotation via httpOnly session cookie
- DB-driven RBAC with fail-closed route registration (a route without an explicit
  access decision refuses to boot)
- OpenAPI 3 docs served at `/docs` (Scalar UI) and `/docs/openapi.json` (raw spec)
- Biome (lint + format), husky + lint-staged pre-commit
- Vitest suite: unit + e2e against a real Postgres via **testcontainers**
- Docker multi-stage builds, k8s manifests, Jenkins DevSecOps pipeline skeleton

## Requirements

- Node.js >= 22
- pnpm >= 10 (`corepack enable`)
- Docker (for the dev database and tests)

## Quick start

```bash
pnpm setup-app          # install deps + generate env files from env/.env.example
# edit env/.env.local — set DATABASE_URL and JWT secrets
pnpm docker:db:dev:up   # start local postgres
pnpm db:init            # run migrations + seed roles/permissions
pnpm start:local:dev    # watch mode on http://localhost:3000
```

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
| `pnpm test:coverage` | Same, with v8 coverage report |
| `pnpm lint` / `lint:fix` | Biome check / autofix |
| `pnpm typecheck` | tsc --noEmit |
| `pnpm sast` | Semgrep scan of src/ |

## Environment variables

All live in `env/.env.<NODE_ENV>` (see `env/.env.example`):

| Var | Default | Notes |
| --- | --- | --- |
| `PORT` | `3000` | |
| `DATABASE_URL` | — | postgres connection string (required) |
| `DB_POOL_MAX` | `20` | pg pool size |
| `ACCESS_TOKEN_SECRET` / `REFRESH_TOKEN_SECRET` / `SESSION_TOKEN_SECRET` | — | change in any real deployment |
| `ACCESS_TOKEN_TTL` | `5h` | jsonwebtoken duration format |
| `REFRESH_TOKEN_TTL_DAYS` | `5` | also drives session cookie maxAge |
| `SESSION_COOKIE_SECURE` | `false` | set `true` behind HTTPS |
| `SESSION_COOKIE_SAMESITE` | `lax` | `lax` / `strict` / `none` |
| `RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX` / `AUTH_RATE_LIMIT_MAX` | `900000/100/10` | global + stricter auth limiter |
| `TRUSTED_DOMAINS` | empty | comma-separated CORS/Socket.IO origins |

## Architecture

```
src/
├── server.ts               # bootstrap: connect DB → health loop → HTTP + socket.io → graceful shutdown
├── app.ts                  # express app: helmet/CSP, cors, rate limit, docs, routes, error handler
├── container.ts            # DI composition root (tsyringe)
├── config/                 # env parsing, auth/session settings, cors & limiter configs
├── database/
│   ├── connection.ts       # sequelize instance + retrying connect
│   ├── models/             # User, Role, Permission, RolePermission, UserRole, Session
│   ├── migrations/         # umzug migrations (register new ones in migrator.ts)
│   ├── seeders/            # idempotent seed: admin/user roles + permission catalog
│   └── scripts/db.ts       # CLI: pnpm db:init / db:migrate:undo
├── common/
│   ├── base.route.ts       # fail-closed route registration (see RBAC below)
│   ├── base.repository.ts  # generic repository over any model
│   ├── rbac/               # decorators, permission catalog/service/middleware, guards
│   ├── middlewares/        # error handler, zod validation
│   └── utils/              # logger, asyncHandler, hash, jwt helpers
└── modules/
    ├── auth/               # register/login/refresh/logout + sessions
    ├── users/              # users CRUD + /me
    ├── roles/              # roles CRUD, permission sync, catalog endpoint
    ├── core/               # API index + socket.io hooks
    └── ../health/          # liveness + readiness probes
```

Every response uses one envelope:

```json
{ "success": true, "message": "...", "data": { } }
{ "success": false, "message": "...", "error": "..." }
```

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

## Testing

`pnpm test` boots a disposable Postgres container (requires Docker), runs migrations +
seeders, then exercises the real HTTP surface with supertest. Keep it that way — the
suite intentionally asserts behavior against the actual database driver.

## Docker & deploy

- `docker compose up` — full stack (app migrates on boot); secrets come from
  `env/.env.production.local` only, never inline.
- `dockerfiles/production/Dockerfile` — multi-stage, frozen lockfile, non-root.
- `k8s/` — deployment/service/hpa/configmap + secret **template** (placeholders only).
- `Jenkinsfile` — gitleaks → lint/typecheck → audit → semgrep → tests → build → trivy →
  staging → ZAP DAST (against `/docs/openapi.json`) → production gate.

## License

Apache-2.0
