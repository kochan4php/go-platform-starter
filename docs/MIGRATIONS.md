# Migration conventions

## Files

- Location: `services/<name>/migrations/`
- Naming: `NNNNNN_name.up.sql` / `NNNNNN_name.down.sql` — strictly increasing, never reused
- Applied by **golang-migrate**; SQL is embedded into the service binary via `go:embed`

## Hard rules

1. **AutoMigrate is banned everywhere** — dev included. Migration files are the single
   source of truth for the schema.
2. Every `.up.sql` has a paired `.down.sql` that reverses it.
3. A service touches only its own schema (`CREATE SCHEMA IF NOT EXISTS <service>…`).

## Zero-downtime (expand/contract)

Under multi-replica rolling deploys old and new pods run side by side, so a migration
must never break the previous binary:

1. **Expand**: add columns/tables as nullable, add indexes `CONCURRENTLY`.
2. **Deploy** code that writes both old and new shapes.
3. **Contract**: only then enforce (`SET NOT NULL`, drop old column) in a later migration.

Never rename-and-drop in one step: add new → dual-write → migrate rows → drop old.

## Execution model

| Environment | How migrations run |
| --- | --- |
| Kubernetes | The `migrate-job.yaml` Job runs golang-migrate (+ seeders) before each rollout. Pods do **not** migrate on boot — readyz verifies the applied version instead, so HPA scale-out never races a migration. |
| Compose / local dev | Boot-time migrate is allowed (single replica). |

golang-migrate's Postgres driver takes an advisory lock while running, so even a
boot-time race cannot corrupt state — the Job model exists to keep rollouts fast and
scale-outs free of migration latency.
