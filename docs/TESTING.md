# Testing & QA

The repository uses the smallest test layer that can prove each boundary:
standard Go tests and fuzzing for services, Vitest/RTL for browser units,
Playwright for real journeys, and k6 for release-load profiles. CI treats the
suite as a gate; skipped container tests are allowed only when Docker is not
available locally. GitHub runners have Docker and execute them.

## Commands

| Gate | Command | Evidence |
| --- | --- | --- |
| Go unit + integration | `go test -count=1 -p 1 ./...` | CRUD, auth, RBAC, worker, migrations, security |
| Race detector | `go test -race -count=1 ./internal/platform ./services/auth/internal ./services/users/internal ./services/rbac/internal ./services/worker/internal` | Linux CI race gate |
| Go fuzz smoke | CI `-fuzz ... -fuzztime 5s` commands | permission grammar, JSON decode, SQL-safe ordering |
| Coverage | `node scripts/check-coverage.mjs [base-sha]` | full report, per-package badges, >=70% changed-code gate |
| Browser unit | `corepack pnpm test` | auth boot/expiry, permission boot branch, helpers, snapshots |
| Contract drift | `corepack pnpm test:contracts` | every literal FE API method/path exists in OpenAPI and generated types |
| Gate regression | `corepack pnpm test:gates` | proves bundle and import-boundary gates fail bad input |
| Real E2E | `corepack pnpm e2e` | desktop Chromium plus tagged Pixel 7 journeys |
| Load | `K6_MODE=users \| login \| soak k6 run scripts/k6/performance.js` | 100 VU list, login storm, one-hour soak |
| Staging API fuzz | `FUZZ_CONFIRM=staging FUZZ_BASE_URL=https://... node scripts/openapi-fuzz.mjs` | malformed and schema-hostile writes must never produce 5xx |
| Chaos | `APP_ENV=staging scripts/chaos-qa.sh redis \| postgres` | fail-open Redis posture and dependency recovery |

On Windows, set `TESTCONTAINERS_RYUK_DISABLED=true` if Docker Desktop blocks
the Ryuk sidecar. `-p 1` deliberately bounds container pressure and reuses the
local image cache; do not run integration packages in parallel on small Docker
Desktop installations.

## Coverage policy

The report always measures the entire Go module. The blocking 70% threshold is
applied to changed executable lines in production Go files, so legacy low-coverage packages remain
visible without making incremental improvement impossible. Generated code,
tests, and unchanged legacy files cannot dilute or satisfy the changed-code
gate. Deterministic per-package SVG badges are written to
`docs/testing/badges/` and the raw profile is uploaded by CI.

## Test naming and data

- Go: `Test<Unit>_<ExpectedBehaviour>` for table-independent checks and
  `Test<Journey>` for integration journeys; fuzz targets start with `Fuzz`,
  benchmarks with `Benchmark`.
- TypeScript: sentence-style `it("does ...")`; E2E titles describe user-visible
  outcomes and use `@mobile` only when a mobile project is required.
- Builders live next to the service tests (`profileBuilder`, `roleBuilder`) and
  expose defaults plus explicit overrides. Stable cross-test examples live in
  `testdata/*.golden.json`; volatile IDs and timestamps are generated per test.
- A test owns its data. Postgres/Redis testcontainers are disposable; E2E uses
  unique timestamped emails and never assumes ordering left by another test.

## Requirement evidence

| Backlog | Executable evidence |
| --- | --- |
| I1-I5 | users/RBAC/auth service integration suites |
| I6-I11 | `services/gateway/e2e_test.go` real mesh contract matrix |
| I12-I18 | contracts Vitest + drift checker, fuzz/property tests, race/coverage CI, mutation spike below |
| I19-I35 | Playwright smoke/lifecycle/security/QA suites, screenshots, axe, Lighthouse >=95 |
| I36-I41 | auth-context, RequirePermission, device label, and contracts unit tests |
| I42-I46 | worker audit/DLQ, reversible migrations, integer identity regression, bounded testcontainers, envelope golden |
| I47-I54 | k6 profiles, staging API fuzzer, security tests, Redis/Postgres chaos scripts |
| I55-I60 | UI primitive snapshots; Storybook N/A; builders/golden fixtures; API fuzz and OpenAPI drift |
| I61-I76 | this convention, worker/RBAC/users/auth integration regressions and original telemetry assertions |
| I77-I80 | self-tests for budget/import gates, mobile visual drawer; i18n N/A |

## Mutation testing spike

The spike is intentionally not a permanent dependency. The valuable mutations
for this codebase are already executable and deterministic: invalid permission
grammar, inverted authorization/CORS outcomes, refresh concurrency, duplicate
identity writes, and bundle/import gate failure tests. A generic source rewriter
would add a second toolchain and mostly mutate generated handlers and SQL-heavy
integration code. Reconsider a dedicated mutation runner when a maintained Go
tool can target selected packages and emit stable machine-readable results.

## Conditional tools

Storybook and an i18n framework have not been adopted, so interaction/i18n
fallback tests are explicitly not applicable. If either dependency enters the
workspace, its interaction/fallback test becomes mandatory in the same PR;
until then Vitest snapshots and literal default copy are the canonical gates.
