# System diagrams

These diagrams complement [the architecture overview](ARCHITECTURE.md). Names
match OpenAPI operations and Redis stream/event names.

## Worker processing and realtime delivery

```mermaid
flowchart LR
  A[auth] -->|email.send| MJ[(mail.jobs)]
  S[any API service] -->|audit.entry| AJ[(audit.events)]
  S -->|webhook.deliver| WH[(webhook.jobs)]
  U[users/auth] -->|force-logout publish| P[(Redis pub/sub)]
  W[worker consumer groups] -->|XREADGROUP| MJ
  W -->|XREADGROUP| AJ
  W -->|XREADGROUP| WH
  W --> D[(dedup marker / audit msg_id)]
  W --> M[mailer/webhook provider]
  W -->|after max attempts| DLQ[(stream:dlq)]
  P --> R[realtime]
  R --> H[room hub]
  H --> WS[authorized WebSocket clients]
```

Workers acknowledge only after side effects and dedup evidence succeed.
`XAUTOCLAIM` recovers abandoned messages; replay requires the offline DLQ
administrator credential. Realtime serializes writes per connection and uses
Redis only for cross-instance control messages.

## Login and authorization

```mermaid
sequenceDiagram
  participant B as Browser
  participant G as Gateway
  participant A as Auth
  participant R as RBAC
  B->>G: POST /auth/login + device ID
  G->>A: validated request
  A->>A: rate/lockout + password + MFA
  A->>R: resolve roles, permissions, version
  R-->>A: claims
  A-->>G: access token + HttpOnly refresh cookie
  G-->>B: envelope
  B->>G: authorized API request
  G->>G: verify JWT and current claims version
  G->>G: enforce route permission
  G-->>B: response
```

## Registration and projection materialization

```mermaid
sequenceDiagram
  participant B as Browser
  participant G as Gateway
  participant A as Auth/Postgres
  participant X as users.events
  participant U as Users consumer
  participant R as RBAC consumer
  B->>G: POST /auth/register
  G->>A: validated registration
  A->>A: commit identity and event outbox
  A-->>G: 201 access + refresh session
  G-->>B: registered
  A->>X: user.created v1
  par projections
    X->>U: materialize profile (upsert)
  and default access
    X->>R: assign default user role (idempotent)
  end
```

The response does not wait for projections. Consumers start at stream position
`0`, and stable IDs/upserts make replay safe.

## Refresh-token rotation and reuse detection

```mermaid
sequenceDiagram
  participant B as Browser
  participant G as Gateway
  participant A as Auth
  participant D as Session store
  B->>G: POST /auth/refresh + HttpOnly cookie + device ID
  G->>A: refresh request
  A->>D: consume current token atomically
  alt current token
    D-->>A: active session family
    A->>D: store rotated token and short grace predecessor
    A-->>B: new access token + rotated cookie
  else grace replay from same device
    D-->>A: already rotated response
    A-->>B: current replacement
  else reuse or device mismatch
    A->>D: revoke entire family
    A-->>B: uniform 401 + clear cookie
  end
```

## Session lifecycle

```mermaid
stateDiagram-v2
  [*] --> Active: login/register
  Active --> Rotated: refresh
  Rotated --> Active: replacement becomes current
  Active --> Revoked: logout/admin revoke/password reset
  Rotated --> Revoked: reuse detection
  Active --> Expired: absolute expiry
  Rotated --> Expired: absolute expiry
  Revoked --> [*]
  Expired --> [*]
```

Revoked and expired sessions never return to active. Account lock/inactivation
also makes active sessions unusable through current-state checks.

## Stream data flow

```mermaid
flowchart TB
  subgraph Producers
    AUTH[auth]
    USERS[users]
    API[all API services]
    SCHED[scheduler leader]
  end
  subgraph Redis Streams
    UE[(users.events)]
    MAIL[(mail.jobs)]
    AUDIT[(audit.events)]
    WEBHOOK[(webhook.jobs)]
    DOMAIN[(configured domain streams)]
  end
  AUTH -->|user.created / user.deleted| UE
  AUTH -->|email.send| MAIL
  USERS -->|user.deleted| UE
  API -->|audit.entry| AUDIT
  API -->|webhook.deliver| WEBHOOK
  SCHED --> DOMAIN
  UE --> USERSC[users projection group]
  UE --> RBACC[RBAC default-role group]
  MAIL --> WORKER[worker mail group]
  AUDIT --> WORKER
  WEBHOOK --> WORKER
  DOMAIN --> HANDLERS[registered worker handlers]
```

## Trust boundaries

```mermaid
flowchart LR
  Internet((Internet)) -->|TLS| Edge[nginx / gateway]
  Edge -->|verified identity + internal secret| Services[private Go services]
  Services -->|scoped credentials| PG[(PostgreSQL schemas)]
  Services -->|ACL users + signed events| Redis[(Redis)]
  Services -->|OTLP/logs/metrics| Obs[observability network]
  Services -->|egress allowlist| Providers[SMTP / HIBP / webhooks]
  CI[GitHub/Jenkins] -->|signed images and deploy identity| Registry[registry]
  Registry --> Cluster[Kubernetes / Compose host]
```

Every arrow crosses an authentication, network, or data-ownership boundary.
Detailed threats and residual risks are in [THREAT_MODEL.md](THREAT_MODEL.md).
