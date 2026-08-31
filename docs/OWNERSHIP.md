# Service ownership

`@kochan4php` is the default repository maintainer. Organizations adopting the
starter must replace these aliases with real teams and an escalation system.

| Area | Code/docs | Accountable owner | Required reviewers |
| --- | --- | --- | --- |
| gateway and public contracts | `services/gateway`, service OpenAPI, `packages/contracts` | platform maintainer | platform + affected service |
| identity and sessions | `services/auth`, `docs/TOKEN_POLICY.md` | identity owner | identity + security |
| profiles | `services/users` | users owner | users + data for migrations |
| roles and permissions | `services/rbac`, permission catalog | access-control owner | access-control + security |
| async processing | `services/worker`, scheduler | operations owner | operations + affected producer |
| realtime | `services/realtime` | realtime owner | realtime + platform |
| web and shared UI | `apps`, `packages/ui` | frontend owner | frontend + accessibility |
| database/migrations | all `migrations`, `docs/data` | data owner | service + data |
| infrastructure/security | `infra`, deployment scripts, `SECURITY.md` | platform/security owner | platform + security |
| documentation/governance | root policies, `docs` | maintainers | affected owner |

Owner means accountable for review and operational accuracy, not the only
person allowed to contribute. A production handoff includes service version,
known risks, dashboards, alerts, runbooks, data ownership, dependencies, and
next escalation time.
