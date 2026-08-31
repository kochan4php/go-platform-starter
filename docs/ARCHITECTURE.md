# ARCHITECTURE

Fresh-build v6 architecture: Go microservices behind a Go gateway, React
micro-frontend shell, Redis Streams as the event backbone.

## Gateway topology

```mermaid
flowchart LR
    subgraph clients
        W[web host :5173]
        R1[web-auth :5174]
        R2[web-admin-users :5175]
        R3[web-admin-roles :5176]
    end
    W --> GW
    R1 -.federated into.-> W
    R2 -.federated into.-> W
    R3 -.federated into.-> W

    GW[gateway :8000<br/>JWT verify · CORS · rate limit<br/>fail-closed route registry · docs]

    GW --> A[auth :8081]
    GW --> U[users :8082]
    GW --> RB[rbac :8083]
    GW --> WK[worker :8084]

    RT[realtime :8085]:::ws
    GW -. ws upgrade .-> RT
    SC[scheduler :8086]:::ws
    SC -. leader-elected events .-> WK

    classDef ws stroke-dasharray: 5 5
```

- JWTs verified **once** at the edge; downstream services trust identity headers
  bound by the internal secret (`X-User-Id`, `X-Email`, `X-Internal-Secret`).
- The route registry is generated from every service's `openapi.yaml` at boot —
  a route without a spec does not exist, and an annotated permission missing
  from the compile-time catalog refuses boot (fail-closed).

## Data ownership (schema-per-service)

```mermaid
erDiagram
    auth_users ||--o{ auth_sessions : "sessions"
    users_profiles {
        bigint id PK
        text display_name
    }
    rbac_roles ||--o{ rbac_role_permissions : ""
    rbac_permissions ||--o{ rbac_role_permissions : ""
    audit_audit_logs {
        bigint id
        text msg_id UK
    }
```

| Schema | Owner | Never holds |
| --- | --- | --- |
| `auth` | credentials + sessions | profile fields |
| `users` | profiles keyed by `sub` | credentials |
| `rbac` | roles / permissions / user_roles | anything else |
| `audit` | append-only trail (**worker-only writer**) | business data |

Cross-service writes are forbidden; lifecycle rides events instead.

The detailed worker/realtime, authentication, registration, token rotation,
session-state, stream-flow, and trust-boundary views live in
[DIAGRAMS.md](DIAGRAMS.md).

## Streams & topics

```mermaid
flowchart LR
    AU[auth] -- user.created --> ST1[(users.events)]
    US[users] -- user.deleted --> ST1
    US -- admin delete --> PL[[purge:profiles list]]

    AU -- email.send --> ST2[(mail.jobs)]
    ALL[any api] -- audit.entry --> ST3[(audit.events)]

    US -- consumes --> ST1
    RB[rbac] -- consumes default-role saga --> ST1
    WK[worker] -- consumes: mail send, audit flush --> ST2
    WK -- consumes --> ST3
    US -- scheduled purge sweep --> PL
    SC[scheduler] -- configured jobs --> ST4[(domain streams)]

    AUTH2[auth force-logout] -- pub/sub channel --> RTK[realtime kick]
```

- Consumer groups start at stream position `0`: pre-consumer events backfill.
- Worker delivery is at-least-once with idempotent handlers and a DLQ after
  5 attempts (`<stream>:dlq`).
- Claim freshness: role edits bump affected users' `ver`; tokens carry it and
  the gateway enforces refresh on mismatch of permissions.

## Web federation

```mermaid
flowchart TD
    HOST["apps/web (host)<br/>router · auth context · RequirePermission"]
    AUTH["apps/web-auth<br/>login/register/forgot/reset"]
    USERS["apps/web-admin-users<br/>paginated table + modals"]
    ROLES["apps/web-admin-roles<br/>role editor + permission sync"]
    UI["@starter/ui tokens+primitives"]
    CT["@starter/contracts typed client"]

    HOST --> AUTH
    HOST --> USERS
    HOST --> ROLES
    AUTH & USERS & ROLES --> UI
    AUTH & USERS & ROLES --> CT
    CT -- bearer + silent refresh --> GW[gateway :8000]
```

Remote URLs are runtime-configurable via `/config.js` (`window.__REMOTE_URLS__`),
so the same images serve any deployment topology.

## Observability flow

```mermaid
flowchart LR
    SVC[every Go service<br/>/metrics + OTLP spans] --> PROM[Prometheus]
    SVC -- traces --> OTEL[otel-collector]
    SVC -- JSON logs --> LOKI[Loki]
    OTEL --> TEMPO[Tempo]
    PROM --> ALERT[Alertmanager]
    PROM & LOKI & TEMPO --> GRAF[Grafana dashboards]
```

Trace IDs ride the `traceparent` header from the gateway through every hop and
appear in each service's slog lines next to the request id.
