# Incident response playbook

## Severity

| Severity | Example | Response target |
| --- | --- | --- |
| SEV-1 | broad outage, confirmed data exposure/loss, auth compromise | acknowledge immediately; continuous command |
| SEV-2 | major feature unavailable, severe degradation, growing backlog | acknowledge within 30 minutes |
| SEV-3 | limited impact with workaround, no urgent security/data risk | normal working-hours response |

Targets are operating goals, not contractual SLAs.

## Roles

- **Incident commander (IC):** owns severity, decisions, cadence, and handoff.
- **Operations lead:** diagnoses and mitigates; does not also manage comms in
  SEV-1.
- **Communications lead:** publishes factual timestamps, scope, and next update.
- **Scribe:** maintains [the timeline](templates/INCIDENT_TIMELINE.md), evidence,
  hypotheses, and actions.

## Response

1. Detect and validate customer impact using external probes and a second
   signal. Open a restricted incident channel and assign roles.
2. Preserve request/trace IDs, logs, deploy identity, alerts, and relevant audit
   records. Never paste secrets or personal data into chat/tickets.
3. Contain using the smallest reversible action. For suspected compromise,
   isolate affected credentials/workloads and preserve evidence before cleanup.
4. Eradicate the root cause, rotate affected secrets, and verify images/config.
5. Recover gradually. Gate on health, synthetic login, p95/5xx, stream lag,
   DLQ, audit writes, and data invariants.
6. Communicate resolution, residual risk, and monitoring period. Close only when
   ownership and next actions are explicit.

Destructive database, queue, or credential actions require IC plus service/data
owner confirmation. Regulatory or customer notification decisions belong to
the organization operating the deployment.

## Afterward

SEV-1/2 incidents require a blameless postmortem within five business days
using [POSTMORTEM.md](templates/POSTMORTEM.md). Actions need an owner, due date,
verification method, and link to the originating incident. Review recurring
themes quarterly and update runbooks, alerts, tests, and threat models.
