---
title: Operations
nav_order: 6
has_children: true
---

# Operations

Running the platform, and what to do at three in the morning.

## During an incident

Start here, in this order.

1. [Runbook](../RUNBOOK.md) — the default operator path.
2. [On-call](../ONCALL.md) — open the service, SLO, and alert dashboards first.
3. [Incident response](../INCIDENT_RESPONSE.md) — severities and response targets.
4. [Incident timeline template](../templates/INCIDENT_TIMELINE.md) — record it while it happens, not afterwards.
5. [Postmortem template](../templates/POSTMORTEM.md) — once it is over.

## Running it

| Page | Read it when |
| --- | --- |
| [Infra and VPS operations](../INFRA_OPS.md) | You are deploying: the production contract for a small VPS, created by OpenTofu. |
| [Backup and restore](../BACKUP_RESTORE.md) | You need the backup cadence, or you need to restore. |
| [Observability](../OBSERVABILITY.md) | You are following one request from browser to gateway to service. |
| [Capacity and cost](../OPERATIONS.md) | You are changing a default. Measure first. |
| [Maintenance template](../templates/MAINTENANCE.md) | You are announcing planned work. |
| [Public status](../STATUS.md) | You want the published status snapshot. |

## Generated references

These two are written by `scripts/generate-docs.mjs` from the compose files,
`.env.example` files, and the Go source. Edit the source, never the page.

- [Published ports](../reference/PORTS.md)
- [Environment variables](../reference/ENVIRONMENT.md)
