# Domain glossary

| Term | Meaning |
| --- | --- |
| access token | Short-lived JWT held in browser memory and verified at the gateway |
| aggregate spec | OpenAPI 3.1 document composed from service-owned specifications |
| claim version (`ver`) | Monotonic RBAC version used to invalidate stale permissions |
| consumer group | Redis Streams cursor and ownership state shared by worker instances |
| correlation/request ID | Identifier propagated through HTTP logs and responses |
| DLQ | Bounded dead-letter stream for messages that exceed retry policy |
| envelope | Stable `{success,message,data \| error}` API response shape |
| event outbox | PostgreSQL record retained until a domain/audit event is published |
| gateway | Public edge service for validation, authn/authz, policy, proxying, and docs |
| materialization | Idempotent projection update from an event, such as creating a profile |
| projection | Read model owned by a service and rebuilt from authoritative events |
| refresh family | Lineage of rotated refresh tokens for one login session/device |
| route registry | Fail-closed gateway table built from service OpenAPI operations |
| schema owner | Only service permitted to write a PostgreSQL schema |
| stream lag | Distance between produced Redis Stream entries and consumer progress |
| subject (`sub`) | Decimal user identity carried by tokens and internal identity headers |
| trust boundary | Point where identity, network, process, or credential assumptions change |
| UAT | Isolated user-acceptance deployment using the production Compose topology |
