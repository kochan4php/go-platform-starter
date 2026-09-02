# Contributing

Thank you for improving go-platform-starter. Keep changes focused, reproducible,
and compatible with the repository's spec-first and schema-ownership rules.

## Start here

1. Install Go from `go.mod`, Node from `.node-version`, pnpm from
   `packageManager`, Docker, and Git.
2. Run `go mod download` and `pnpm install --frozen-lockfile`.
3. Use `./scripts/dev-all.sh -d` for native development or
   `./scripts/deploy-lab.sh` for the complete container mesh.
4. Read [the engineering guide](docs/ENGINEERING_GUIDE.md),
   [developer experience guide](docs/DEVELOPER_EXPERIENCE.md),
   [architecture](docs/ARCHITECTURE.md), and [contracts](docs/CONTRACTS.md)
   before changing a service boundary.

## Change workflow

- Branch from current `main`; use `feat/<topic>`, `fix/<topic>`, or
  `docs/<topic>`.
- Use Conventional Commits. Keep generated code and documentation in the same
  commit as their source.
- Add an ADR for a durable, cross-service decision. Follow
  [the ADR index](docs/adr/README.md).
- Never edit an applied migration. Add a numbered up/down pair and follow
  [migration conventions](docs/MIGRATIONS.md).
- Update a service OpenAPI document before its handler. Run `pnpm contracts`
  and commit the generated aggregate and TypeScript types.
- Run `node scripts/generate-docs.mjs` after changing Compose, environment
  examples, package manifests, or API operations.

## Required local checks

The canonical shortcut is `make dev-test`; its explicit commands are:

```sh
go fmt ./...
go vet ./...
go test ./...
pnpm lint
pnpm check:deps
pnpm test
pnpm build
pnpm contracts
pnpm test:contracts
node scripts/generate-docs.mjs --check
node scripts/check-docs.mjs
```

Container-backed tests require Docker. A documentation-only change may omit
unrelated runtime tests, but must pass both documentation checks and a strict
MkDocs build.

## Pull requests

Complete the pull-request template, including release notes, rollout/rollback,
security, data, and documentation impact. Reviewers may ask for a smaller PR if
independent behavior is mixed together. Generated artifacts are reviewed as
evidence; their generator is the source of truth.

By participating, you agree to the [Code of Conduct](CODE_OF_CONDUCT.md).
Security reports follow [SECURITY.md](SECURITY.md), never a public issue.
