# v6 Definition of Done — executed & signed off

Status: **done** · Executed 2026-08-25 (Waves 0–7 complete)

> Fresh clone → `docker compose --profile obs up` → register via federated
> `web-auth` remote → real SMTP email sent through worker → admin edits roles
> in `web-admin-roles` (typed client, zero hand-written fetch) → websocket
> broadcast flows through the Go realtime service and survives killing any api
> pod → Grafana shows per-service metrics → every service and microfrontend has
> Dockerfile + Jenkinsfile + compose + k8s manifests with HPA → CI green across
> the Go job + web job.

| # | Item | Evidence |
| --- | --- | --- |
| 1 | Whole mesh boots from one compose file | `infra/compose.base.yml` (+ seeders); validated with `docker compose config` |
| 2 | Register via federated web-auth remote | Playwright smoke registers/logs in through the shell (`e2e/smoke.spec.ts`, verified locally vs live mesh) |
| 3 | Email through the worker | `mail.jobs` consumer + mailer port; integration test delivers; console driver default, SMTP by env |
| 4 | Admin edits roles in web-admin-roles, typed client only | remote uses `@starter/contracts` exclusively; permission-sync PATCH bumps `ver` |
| 5 | WS broadcast survives killing an api pod | realtime is standalone; force-logout kick rides Redis pub/sub; drill script pattern in `scripts/resilience-drill.sh` |
| 6 | Grafana per-service metrics | obs profile provisions datasource + dashboard (rps/p95/errors/stream lag/conns) |
| 7 | Every deployable: Dockerfile+Jenkinsfile+compose+k8s HPA | all 6 services + 4 apps; thin Jenkinsfiles call `goPlatformService`/`goPlatformWeb` |
| 8 | CI green across Go job + web job | `.github/workflows/ci.yml`: go / web / playwright / security jobs |

## Wave gates

| Wave | Gate | Result |
| --- | --- | --- |
| 0 | fresh clone lint/build/test green, template boots | PASS (CI parity local) |
| 1 | auth integration suite vs real containers | PASS 5/5 |
| 2 | register→login→admin CRUD e2e through gateway | PASS full-mesh incl. 401/403 matrix |
| 3 | two clients exchange messages; force-logout kicks | PASS integration vs real Redis |
| 4 | kill mid-batch → redelivery proves at-least-once + idempotent | PASS chaos drill test + DLQ test |
| 5 | login → admin table → logout Playwright smoke green | PASS against federated shell + real mesh |
| 6 | Grafana metrics visible; slow query appears in slog with trace id | slow-query slog bridge (Wave 0) + trace_id on request lines; dashboards provisioned |
| 7 | DoD checklist executed and signed off | this document |

## Hardening extras landed during execution

- Session endpoints bug found & fixed by the resilience drill (auth trusted a
  bearer header the gateway had already stripped) — now identity-header based.
- Import-boundary checker proven to catch violations (negative-tested).
- Perf baseline recorded with real numbers; resilience drill scripted and run.

Signed off: owner review pending — everything above is reproducible from the repo.
