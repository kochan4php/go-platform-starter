# Engineering guide

## Definition of done by work type

| Work | Required evidence |
| --- | --- |
| API/backend | OpenAPI first, generated bindings/types fresh, authorization and boundary validation, unit/integration test, observability, docs |
| frontend/UI | loading/empty/error/success states, keyboard and screen-reader basics, responsive behavior, RTL test, production build |
| data/migration | immutable numbered up/down pair, timeout/lock review, empty-schema and rollback test, mixed-version/backup plan |
| infrastructure | least privilege, resource/probe/rollback behavior, manifest validation, runbook and owner |
| security | threat/control mapping, negative test or scanner evidence, no secret disclosure, security-owner review |
| documentation | technically verified commands/links, generated sources fresh, portal strict build |

The repository-level [DOD.md](DOD.md) records system acceptance; this table is
the per-change gate.

## Go standards

- Format with `gofmt`; pass `go vet` and golangci-lint.
- Keep services behind `services/<name>/internal`; shared behavior must be
  genuinely cross-service and live in `internal/platform`.
- Accept `context.Context` first for I/O, bound timeouts at process/network/data
  boundaries, wrap errors with operation context, and never log secrets.
- Use parameterized SQL, stable pagination order, explicit transactions, and
  hand-written migrations. `AutoMigrate` is prohibited.
- Prefer the standard library and small concrete types. Add interfaces at
  external boundaries or where multiple implementations actually exist.

## TypeScript and React standards

- TypeScript stays strict; generated OpenAPI types are the API source of truth.
- Use `@starter/contracts` instead of handwritten fetch shapes and
  `@starter/ui` instead of app-local design primitives.
- Keep server state in TanStack Query, access tokens in memory, and effects
  cancellable. Do not treat UI permission guards as authorization.
- Components expose semantic HTML, labels, focus behavior, reduced-motion
  support, and visible error recovery. Biome owns formatting/linting.

## Naming

| Scope | Convention | Example |
| --- | --- | --- |
| Go packages/files | short lowercase; snake-case files only when conventional | `platform`, `service_test.go` |
| Go exported identifiers | PascalCase with standard initialisms | `HTTPClient`, `UserID` |
| TypeScript values/functions | camelCase | `createApiClient` |
| React components/types | PascalCase | `UsersPage` |
| API JSON | camelCase | `displayName` |
| URLs | lowercase nouns; version at `/api/v1` | `/api/v1/rbac/roles` |
| env vars | uppercase snake case, scoped when ambiguous | `DB_MAX_OPEN_CONNS` |
| events | lowercase dotted past-tense fact | `user.created` |
| Redis streams | lowercase dotted domain collection | `users.events` |
| SQL constraints/indexes | `pk_`, `fk_`, `uq_`, `ck_`, `ix_` | `uq_sessions_token_hash` |
| migrations | six-digit sequence + description | `000005_add_status.up.sql` |

## Git workflow

Branch from `main`, make a focused Conventional Commit, rebase on current
`main`, and open a PR. Never force-push shared/default branches, rewrite released
tags, or combine unrelated refactors with behavior. Merge only after required
checks and ownership review; prefer squash when intermediate commits are not
independently meaningful.

## Review guide

Review correctness and risk before style. Trace trust boundaries, failure and
rollback paths, authorization, data ownership, concurrency/idempotency, public
contracts, observability, tests, and generated drift. Ask for evidence rather
than confidence. Block on correctness/security/data-loss risks; label optional
cleanup clearly so it does not masquerade as a requirement.
