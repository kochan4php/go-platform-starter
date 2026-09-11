# AGENTS.md

Guidance for coding agents working in this repository. Claude Code reads it via
`CLAUDE.md`; other agents read it directly.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

## Commands

Go and pnpm are both required (Go >= 1.27, Node 24 + `corepack enable` for pnpm 11).
On Windows, run `make` targets from Git Bash.

```bash
make dev-test            # the canonical pre-push gate (go test/vet + pnpm lint/test/contracts/devx)
make build test          # go build ./... && go test -count=1 ./...
make lint fmt vet        # golangci-lint / gofumpt / go vet
make contracts SVC=auth  # regenerate oapi-codegen stubs for one service
make new-service NAME=x  # scaffold generators (also new-migration, new-handler)
make help                # every target with its description
```

Single test:

```bash
go test ./services/auth/... -run TestRefreshRotation -count=1 -v
corepack pnpm --filter web-admin-users test -- -t "renders the directory table"
corepack pnpm e2e --grep "login"
```

Go tests that need Postgres/Redis use testcontainers (`internal/testutil`) and **skip
silently when Docker is down** — a green `go test` without Docker proves less than CI.

Frontend/workspace gates (each is its own CI job, run the one you broke):

```bash
corepack pnpm lint              # Biome
corepack pnpm test              # Vitest + RTL, per workspace
corepack pnpm contracts         # regenerate aggregate spec + TS types
corepack pnpm test:contracts    # spectral + contract freshness
corepack pnpm check:deps        # workspace import boundaries
corepack pnpm check:budget      # host bundle-size gate
corepack pnpm check:architecture
node scripts/generate-docs.mjs --check && node scripts/check-docs.mjs
```

Running the platform:

```bash
./scripts/dev-all.sh -d      # native processes + hot reload (status | logs <svc> | down)
./scripts/deploy-lab.sh      # full docker mesh, all ports published
make run SVC=auth            # one service alone
```

Lab shell <http://127.0.0.1:5173>, aggregate docs <http://127.0.0.1:8010/docs>,
seeded admin `admin@example.local` / `local-root-access-2026!`.

## Architecture

One Go module + one pnpm workspace. Six Go services behind a gateway, a React
module-federation shell with three remotes, Postgres (schema per service) and Redis.

**Service isolation is compiler-enforced.** Code lives in `services/<svc>/internal/...`,
which Go refuses to let another service import; depguard bans the rest. Genuinely
shared behavior goes in `internal/platform` (env parsing, slog, middleware, envelope,
pagination, tracing, mailer/error-reporter ports, scheduler, permissions catalog) —
nothing else is shareable.

**Spec-first.** `services/<svc>/openapi.yaml` is the source of truth; behavior absent
from it does not exist. Edit the spec, then `make contracts SVC=<svc>`; `gen/` is
committed and CI fails on staleness. The gateway builds a **fail-closed route registry**
from every service spec at boot (`x-required-permission` annotations — unknown
permission refuses boot, unknown route is 404), so a new endpoint is unreachable until
its spec says who may call it.

**Auth flows through the edge once.** The gateway verifies the JWT and forwards
identity headers bound by `INTERNAL_SECRET`; downstream services trust those headers
and never re-verify (`/me` in users does zero cross-service calls). Access token lives
in browser memory, refresh token in an httpOnly cookie with rotation + reuse detection.
UI `<RequirePermission>` is a hint, never authorization. See docs/TOKEN_POLICY.md.

**Schema ownership is absolute**: `auth` (credentials/sessions), `users` (profiles keyed
by `sub`), `rbac` (roles/permissions), `audit` (worker is the only writer). Cross-schema
writes are forbidden — lifecycle rides Redis Streams (`users.events`, `mail.jobs`,
`audit.events`), consumed by `worker` with consumer groups starting at `0`,
XAUTOCLAIM redelivery, DLQ after five attempts, idempotent handlers. Payload contracts
in docs/CONTRACTS.md.

**Migrations are numbered SQL pairs** embedded per service with `go:embed`.
`AutoMigrate` is banned. Never edit an applied migration — add a pair
(`make new-migration SVC=users NAME=add_flag`).

**Frontend**: `apps/web` is the federation host (router, auth context, guards);
`web-auth`, `web-admin-users`, `web-admin-roles` are remotes. All API calls go through
`@starter/contracts` (generated types + openapi-fetch wrapper with 401 → silent refresh
→ retry once) — hand-written fetch is rejected by `check:deps`. Shared primitives and
Tailwind v4 tokens live in `@starter/ui`. Server state belongs in TanStack Query
(key conventions in docs/QUERY_KEYS.md).

Deeper maps: docs/ARCHITECTURE.md (diagrams), docs/ENGINEERING_GUIDE.md (per-change
definition of done, naming table), docs/index.md (full doc index).

## Conventions that bite

- Conventional Commits, enforced by commitlint. Branch `feat/<topic>` from `main`.
- Generated code and docs belong in the same commit as their source.
- After changing Compose, env examples, package manifests or API operations, run
  `node scripts/generate-docs.mjs`.
- UI tests key off accessible names (`getByLabel("Email")`, `Users (N)` heading) — keep them.
- `services/_template` is the canonical service shape; `check:architecture` flags drift from it.
