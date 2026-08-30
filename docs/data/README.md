# Data schema registry

PostgreSQL migrations under `services/*/migrations` are the only writable schema
source. The files generated here are read-only projections of a migrated database:

- `SCHEMA.md` — schema registry and per-column data dictionary;
- `schema.dbml` — importable ERD;
- `AUDIT.md` — defaults, comments, timestamp types, and constraint-name audit.

Generate them against a disposable, fully migrated PostgreSQL database:

```sh
DATABASE_URL=postgres://... go run ./cmd/dbdocs
```

CI can verify committed output with `go run ./cmd/dbdocs -check`. Compare two
environments without exposing their contents with:

```sh
SOURCE_DATABASE_URL=postgres://... TARGET_DATABASE_URL=postgres://... scripts/schema-drift.sh
```

Only a deterministic catalog fingerprint is printed. Passwords and row data are
never read by the generator.
