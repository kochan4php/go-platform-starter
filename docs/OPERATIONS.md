# Capacity and cost planning

Measure before changing defaults. The starter's baseline targets roughly 100k
registered users, not 100k concurrent users.

## Capacity worksheet

Copy this table into the deployment record and replace every placeholder with
observed peak and projected values.

| Signal | Current peak | 12-month projection | Limit/SLO | Headroom | Action trigger |
| --- | ---: | ---: | ---: | ---: | --- |
| edge requests/s | | | | | sustained >70% for 15m |
| p95 latency | | | | | error-budget burn |
| concurrent WebSockets | | | | | >70% room/process cap |
| PostgreSQL connections | | | | | >70% pool/server max |
| database size + monthly growth | | | | | restore exceeds RTO |
| Redis memory | | | | | >70% maxmemory |
| stream ingress and max lag | | | | | oldest job exceeds SLO |
| worker jobs/s | | | | | lag grows for 10m |
| outbound email/webhooks | | | | | provider quota >70% |
| backup size and restore duration | | | | | RPO/RTO missed |

Load-test the expected traffic mix using `scripts/k6/performance.js`; do not
extrapolate a single endpoint benchmark to the whole platform.

## Monthly cost worksheet

Provider prices vary, so the repository records quantities and formulas rather
than stale currency claims.

| Environment | Compute | Database/storage | Redis | Egress/providers | Observability/backup | Formula |
| --- | --- | --- | --- | --- | --- | --- |
| dev | developer machine hours | local volumes | local | test mail only | local retention | hours × internal workstation rate |
| lab | service/app container hours | lab GB-month | lab GB-hour | test traffic | short retention | sum(resource quantity × provider unit price) |
| UAT | prod-shaped instance hours | UAT GB + backup | UAT node | acceptance traffic | production-like retention | measured monthly quantities × current price sheet |
| demo | scheduled instance hours | demo GB + backup | demo node | stakeholder traffic | bounded retention | UAT formula × active-time ratio |
| prod | redundant service hours | primary GB + WAL + off-host backup | HA capacity | real mail/webhooks/egress | logs, metrics, traces, uptime | quantity × contracted unit price + 20% contingency |

Record currency, region, tax, discounts, commitment term, pricing date, owner,
and source URL next to the completed estimate. Review quarterly and before any
topology, retention, or traffic change.
