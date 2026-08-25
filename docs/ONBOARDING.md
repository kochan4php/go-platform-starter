# ONBOARDING

Goal: clone to first merged PR in about 30 minutes. Two toolchains are
required: **Go >= 1.27** and **Node >= 22 with pnpm 11** (`corepack enable`).

## 0. Install (5 min)

- Go 1.27+ (`go version`)
- Node 24 + `corepack enable` (ships pnpm)
- Docker Desktop (integration tests + lab/uat/demo stacks)
- make (bundled with git-bash on Windows, or run the underlying commands directly)

## 1. Clone and verify the Go side (10 min)

```bash
go build ./...
go test ./...          # container tests auto-skip when Docker is down
```

Green? You are in. The gate is identical to CI: gofmt, go vet,
golangci-lint, tests, generated-code freshness
(`make contracts SVC=_template && git diff --exit-code`).

## 2. Verify the web side (10 min)

```bash
pnpm install
pnpm contracts      # regenerate TS types from services/*/openapi.yaml
pnpm lint           # Biome
pnpm check:deps     # workspace import-boundary rules
pnpm test           # Vitest + RTL
pnpm build          # all four apps
pnpm check:budget   # host bundle-size gate
```

## 3. Pick your environment

| Environment | What it is | How to run |
| --- | --- | --- |
| **dev** (native processes) | Fastest loop: `go run` for every service plus vite dev servers with hot reload. Logs under `tmp/dev/logs/`. | `./scripts/dev-all.sh` (stop: `down`) |
| **lab** (docker) | The whole mesh in containers on your machine; every port published, debug logging, console mailer. Best for integration debugging close to production topology. | `./scripts/deploy-lab.sh` |
| **uat / demo / prod** | VPS deployments behind the edge nginx, isolated by project name and env file. | see [Deployment](#deployment) below |

### Native dev loop (recommended for daily work)

```bash
./scripts/dev-all.sh -d        # start detached
./scripts/dev-all.sh status    # per-component up/down table
./scripts/dev-all.sh logs auth # tail one component
./scripts/dev-all.sh down      # stop everything
```

Admin login for seeded environments:
`admin@example.local` / `admin-bootstrap-pw`.

### Lab stack (docker)

```bash
./scripts/deploy-lab.sh         # build + migrate + seed + start
./scripts/deploy-lab.sh --down  # stop
```

Shell at http://localhost:5173, gateway docs at http://localhost:8000/docs.
Every service port is published (8081-8085, 8000, 5173-5176) so you can hit
components directly or attach profilers.

Observability on top of either environment:

```bash
docker compose -f infra/compose.observability.yml --profile obs up
# Grafana http://localhost:3000 · Prometheus http://localhost:9090
```

## 4. Make a PR (5 min)

- Conventional commits enforced (`feat(scope): ...`) — commitlint runs in CI.
- New column => new numbered migration pair (`docs/MIGRATIONS.md`);
  AutoMigrate is banned everywhere.
- API change => edit `services/<svc>/openapi.yaml` first, then
  `make contracts SVC=<svc>`; CI fails on stale stubs.
- Web API calls go through `@starter/contracts` only — no hand-written fetch.
- UI work: keep the accessible labels used by tests (`getByLabel("Email")`,
  role names, `Users (N)` heading), and run the full gate above before pushing.
