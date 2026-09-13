# Threat model (STRIDE)

The browser crosses nginx into the gateway. The gateway verifies JWTs and
stamps identity headers protected by a rotating internal secret. Auth, users,
RBAC, worker, and realtime use private PostgreSQL/Redis. External boundaries
are SMTP, HIBP, Vault/KMS, registry, CI, and the cluster control plane.

Critical assets are credentials, sessions, MFA seeds, keys, roles, audit
evidence, personal data, stream jobs, and deployment credentials.

| Boundary | Main STRIDE threats | Controls |
| --- | --- | --- |
| Edge/gateway | forged JWT/XFF, route tampering, disclosure, rate/body DoS | TLS 1.3, CSP/COOP/COEP/CORP, trusted proxies, OpenAPI validation, per-route policy, fail-closed registry |
| Auth | stuffing, refresh replay, MFA theft, enumeration, stale privilege | password/HIBP/history, account rate, encrypted TOTP, device binding, grace rotation, JWT `kid`, claim versions |
| Users | IDOR, profile XSS, avatar SSRF, personal-data disclosure | resource helper, plain text, public-HTTPS guard, soft delete, export/erasure |
| RBAC | forged internal request, role tampering, repudiation | constant-time secret ring, transactions, audit, version invalidation/forced logout |
| Worker/streams | forged/malformed event, poison loop, audit tampering, DLQ abuse | schema validation, HMAC, optional AES-GCM, dedup, bounded retries, ACL-only replay |
| Realtime | socket spoofing, presence leakage, connection DoS | JWT ring, authorization, forced logout, gateway limits |
| Kubernetes/CI | image/secret substitution, privileged workload, supply chain | restricted PSS, default deny, ESO/KMS, cosign, SBOM, scans, licenses, Falco/audit |

## Per-service review

| Service | Entry points and assets | Primary abuse cases | Detection and containment |
| --- | --- | --- | --- |
| gateway | public HTTP/WebSocket, JWT keys, route policy | header spoofing, permission bypass, SSRF/proxy confusion, body/rate DoS | request/trace IDs, validation/auth/rate metrics, fail-closed registry, upstream isolation |
| auth | login/register/refresh/reset, credentials/MFA/session keys | stuffing, enumeration, reset theft, refresh replay, session fixation | uniform errors/timing, account/device rate limits, token-family revocation, auth alerts |
| users | profile CRUD/export/avatar, personal data | IDOR, stored content injection, avatar SSRF/decompression DoS, export abuse | resource authorization, plain-text rendering, HTTPS/public-host and image bounds, audit |
| RBAC | role/permission mutation, claim versions | privilege escalation, unknown permission injection, stale claims, admin-role damage | allow-listed permissions, transactions, system-role guards, version invalidation, audit |
| worker | Redis Streams, email/webhook/audit data | forged event, poison/replay, webhook SSRF, audit loss/tamper | signed/versioned events, allowlists, dedup, bounded DLQ, outbox and lag alerts |
| realtime | WebSocket handshake, rooms/presence | token leakage, unauthorized room, connection flood, concurrent-write corruption | subprotocol auth, room allowlist/caps, serialized writes, forced logout and metrics |
| scheduler | job configuration, leader lock, domain streams | duplicate scheduling, arbitrary stream/event, lock loss | validated config, allow-listed handlers, renewable lock, publish/audit metrics |

Each service review is required when its entry point, asset, data flow, provider,
or trust boundary changes. Security controls that exist only as unapplied
templates are recorded as residual risk, not credited as deployed protection.

Residual risk: HS256 needs careful shared-key distribution; asymmetric signing,
email verification, CAPTCHA, mTLS, and sensitive-role approval remain explicit
product decisions. Cluster templates become controls only after operators apply
and verify them. Review this model on boundary changes and every six months.
