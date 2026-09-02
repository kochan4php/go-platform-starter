# Developer experience

This repository treats developer tooling as a reproducible product surface. The
default path uses Make, Node's standard library, committed configuration, and the
tools already required by CI. Biome is the only JavaScript/TypeScript linter;
ESLint is intentionally absent.

## Supported development hosts

| Host | Supported path | Required software |
| --- | --- | --- |
| Windows 11 | Git Bash or WSL2; Docker Desktop using the WSL2 engine | Git, Go 1.27, Node 22, Corepack, GNU Make, Docker Compose v2 |
| macOS 14+ | Native terminal and Docker Desktop/Colima | Xcode CLI tools, Go 1.27, Node 22, Corepack, GNU Make, Docker Compose v2 |
| Ubuntu 24.04+ | Native shell and Docker Engine | build-essential, Git, Go 1.27, Node 22, Corepack, Docker Compose v2 |

The devcontainer is the portable fallback. Open the repository in VS Code and
select **Dev Containers: Reopen in Container**.

### Version managers

`mise install` reads the committed `.mise.toml` and installs Go, Node, and
pnpm together. If only Node is managed, `fnm install` reads
`.node-version`, then `corepack enable` activates the pinned pnpm version.
Direct installers remain supported as long as versions match the table.

Windows PowerShell users can install prerequisites with `winget`, but should
run Make and shell scripts from Git Bash:

```powershell
winget install Git.Git GoLang.Go OpenJS.NodeJS.LTS Docker.DockerDesktop
corepack enable
```

macOS:

```sh
brew install go node pnpm make mkcert delve air
```

Ubuntu:

```sh
sudo apt update
sudo apt install -y build-essential git curl shellcheck
corepack enable
```

## Daily commands

```sh
make hooks                    # Husky + lint-staged + commitlint
make dev-test                 # deterministic pre-push gates
./scripts/dev-all.sh          # complete native mesh
make dev SVC=auth             # one service with committed Air config
make open                     # shell, aggregate API docs, health
make open-docs                # direct Scalar docs + standalone entry index
make test-watch               # Go watch loop
make web-test-watch           # Vitest watchers
make logs SVC=auth
make db-shell SVC=users
make psql
make redis-cli
```

Frontend staged files are formatted and linted by Biome. Go staged files use
gofumpt. The pre-commit hook also runs gitleaks; install it before enabling
hooks. The commit-msg hook applies Conventional Commits through commitlint.

## Local services and test data

The lab overlay starts Mailpit at `127.0.0.1:8025`. Optional database tools
start with:

```sh
docker compose -p go-platform-lab -f infra/compose.base.yml -f infra/compose.lab.yml --profile tools up -d
```

RedisInsight is then at `127.0.0.1:5540`, and pgweb at
`127.0.0.1:8087`. Both bind only to loopback.

`make seed` registers 20 deterministic users and distributes them across
user, operator, auditor, and support roles. Their development-only password is
printed by `node scripts/devx.mjs fake-data`. `make seed-reset` truncates
only application schemas in the explicitly named `go-platform-lab` Compose
project, reruns bootstrap seeds, and recreates the demo users. Never point these
commands at another Compose project.

Testcontainers creates an isolated database/Redis pair per Go test fixture.
Frontend tests reset MSW handlers after each test. Do not share mutable fixture
rows between tests; create them inside the test and let the container or
transaction own cleanup.

## Generators

```sh
make new-service NAME=audit
make new-migration SVC=users NAME=add_locale
make new-handler SVC=users OP=listUsers
make db-diagram
node scripts/devx.mjs fake-data 50 csv
```

`new-service` copies the maintained `services/_template` and includes the
OpenAPI document, generated interface baseline, reversible migration, Air
configuration, deployment assets, and an e2e ping stub. It refuses unsafe names
and existing destinations. `new-migration` allocates the next six-digit
sequence and creates a timeout-bounded up/down pair. `new-handler` accepts
only an operationId already present in that service's OpenAPI document.

Environment documentation is generated from Go `env`/`envDefault` struct
tags, committed examples, and Compose interpolation:

```sh
make check-env
pnpm docs:gen
```

## Local HTTPS

Install mkcert, then run `make https`. The command creates ignored certificates
under `tmp/certs`, enables secure cookies, and starts all four Vite entries on
`https://127.0.0.1:5173-5176`. Each Vite server proxies API, health, docs, and
WebSocket traffic to the HTTP gateway, preventing mixed-content failures.

Trust only the local mkcert CA. Never commit certificates or reuse them outside
development.

## Debugging and profiling

VS Code includes launch and attach configurations. For a terminal attach:

```sh
dlv attach <pid>
# or
make delve PID=<pid>
```

Start a single service through `make dev SVC=<name>` when breakpoints should
survive rebuilds. Each service owns a committed `.air.toml`.

For CPU profiles, run the observability overlay and query the loopback-published
pprof endpoint:

```sh
docker compose -p go-platform-lab -f infra/compose.base.yml -f infra/compose.observability.yml --profile obs up -d
go tool pprof http://127.0.0.1:6060/debug/pprof/profile?seconds=30
```

Local traces flow from services to the OpenTelemetry collector at
`127.0.0.1:4318`, then Tempo at `127.0.0.1:3200`. Use the request ID and
trace ID from structured logs to correlate a failed request. See
[observability](OBSERVABILITY.md) for sampling and production differences.

## API review and CI linting

CI runs shellcheck, actionlint, yamllint, markdownlint, Biome, revive's exported
comment rule, generated-header verification, linked TODO/FIXME scanning, and
the error-wrapping convention check. OpenAPI PRs produce an oasdiff Markdown
report; definite breaking changes fail the gate. Danger checks migration pairs,
contract regeneration, PR size, and documentation impact from a trusted
base-branch Dangerfile.

Generated files must start with their generator header. Never hand-edit them.
Wrap returned errors with operation context and `%w`:

```go
return fmt.Errorf("load profile %d: %w", id, err)
```

Use `errors.Is` or `errors.As` at decision boundaries. Do not stringify and
recreate an error, because that destroys its causal chain.

## Decisions

- **Go watch (J14):** not adopted. Go 1.27 still has no repository watch loop
  equivalent to Air; committed Air configurations are already portable and
  explicit.
- **Task/Just (J23):** not adopted. Make is already installed in CI,
  devcontainers, and documented host paths. A second task DSL would duplicate
  commands without removing a measured constraint.
- **Internal npm mirror (J75):** the committed `.npmrc` prefers the local
  store and bounds retries. For a slow or isolated network, copy
  `.npmrc.mirror.example` outside the repository, replace its URL, and set
  `NPM_CONFIG_USERCONFIG` to that file. Credentials stay outside Git.
- **Release notes (J74):** Release Please owns versioned notes; CI verifies the
  release workflow and requires a non-empty Unreleased changelog section.

## Delivery map

| Items | Evidence |
| --- | --- |
| J1-J4 | Make pre-push target, open target, Husky/lint-staged, local commitlint |
| J5-J8 | EditorConfig, VS Code settings/extensions/Delve, devcontainer |
| J9-J12 | shellcheck, actionlint, yamllint, markdownlint CI gates |
| J13-J15 | Per-service Air, documented watch decision, direct Scalar server |
| J16-J17 | Deterministic role-varied seed and lab-only reset |
| J18-J22 | Service/migration generators, DB/log shell helpers, direct docs |
| J23-J25 | Make decision, env validation, struct-tag documentation generator |
| J26-J32 | Changelog modal, mkcert HTTPS, Delve/watch, entries index, MSW Node server |
| J33-J36 | Fake-data CLI, DBML generator, oasdiff report and breaking gate |
| J37-J41 | PR/issue templates, CODEOWNERS, contributing and governance |
| J42-J47 | Support matrix, troubleshooting/FAQ/glossary, ADR template/index |
| J48-J50 | Grouped Renovate schedule, patch devDependency automerge, lockfile maintenance |
| J51-J55 | Mailpit, optional RedisInsight/pgweb, psql/redis-cli shortcuts |
| J56-J59 | Persistent env badge, troubleshooting link, handler/service generators |
| J60-J63 | Revive comments, linked debt scan, generated headers, wrapping lint |
| J64-J72 | Version managers, OS setup, pprof, Delve, tracing, test isolation |
| J73-J76 | Danger automation, release-note verification, mirror config, wrapping convention |
