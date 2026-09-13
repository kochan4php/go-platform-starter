# Product roadmap implementation

The Product / Roadmap slice turns the existing auth, users, RBAC, worker,
realtime, gateway, and observability foundations into operator-facing product
flows. All new REST operations remain spec-first and return the standard API
envelope.

## Accepted product decisions

- Product workflows use a typed, size-bounded `users.product_records` table.
  Secrets are stored only as keyed digests and are shown once when created.
- Invitations and passwordless links are single-use and expire. Account
  deletion disables access immediately, preserves the profile for 30 days,
  and erases it through existing retention housekeeping after the grace period.
- Support impersonation lasts at most 15 minutes, contains read permissions
  only, identifies the original actor in the JWT, and emits an audit event.
- Temporary delegation lasts at most 30 days. RBAC claim resolution includes
  only active, unexpired delegated permissions; normal access-token lifetime
  bounds propagation and expiry to at most one token refresh interval.
- Login anomaly detection is an explainable local risk model based on failed
  attempts, network novelty, device novelty, and recent failures. An opaque
  hosted ML dependency is deliberately not introduced for the starter's data
  volume or privacy posture.
- Branding, retention, and custom-domain configuration are deployment-scoped.
  This starter has no tenant boundary, so pretending these records are
  tenant-isolated would be unsafe. A future tenant model must add an explicit
  tenant key and row-level authorization first.
- Usage metering is informational. No payment processor or automatic charge is
  enabled. Role templates are curated records, not executable third-party code.
- OpenTofu remains the infrastructure provider surface. Administrative product
  automation uses the versioned REST contract or `platformctl`; a custom
  Terraform plugin is deferred until resource lifecycle semantics are stable.

## Operator workflow

Administrators open **Product Console** to view aggregate health, registration
trends, activity, role usage, login risk, and metering. The same page manages
invitations, approvals, delegations, API keys, webhooks, schedules, saved
views, role templates, compliance evidence, branding, domains, quotas,
broadcasts, and durable notification/chat records.

Users open **Settings** for profile and verified-email changes, password and
MFA setup, one-use recovery codes, session revocation, login history,
notifications, onboarding, data export, and grace-period deletion.

Run the dependency-free administration CLI with an access token:

```bash
go run ./cmd/platformctl overview
go run ./cmd/platformctl search "alice"
go run ./cmd/platformctl invite alice@example.com "Engineering invite"
go run ./cmd/platformctl records webhook
```

`PLATFORM_URL` defaults to `http://127.0.0.1:8010`; `PLATFORM_TOKEN` is required
and is never accepted as a command-line argument, keeping it out of shell
history.

## Capability evidence

| Backlog | Delivered surface |
| --- | --- |
| R1, R19, R20 | Settings profile form, verified-email flow, and password rotation |
| R2, R17, R21-R23 | Own-session list/revoke, MFA setup, recovery codes, and login history |
| R3-R5, R16, R24, R32-R34, R41, R49-R50 | Product Console overview, trend chart, audit filter/export, realtime, analytics, search, permission simulation, quota metrics, and usage meter |
| R6-R7 | Persistent notification center and scheduled daily/weekly email dispatcher |
| R8-R10 | Expiring invitation links, bulk invite CSV, and existing user CSV/JSON import/export |
| R11-R14, R51 | Role-template library, access requests, approval inbox, and expiring delegated claims |
| R15 | Audited 15-minute read-only impersonation with visible exit control |
| R18 | Immediate disable plus 30-day restore link and delayed permanent purge |
| R25-R27 | Realtime broadcast/chat and privacy-safe authenticated aggregate presence API |
| R28, R48 | Executable Scalar API portal at `/docs` using the composed OpenAPI contract |
| R29-R30 | One-time-secret API key records and SSRF-validated webhook management/test delivery |
| R31, R35, R43 | Scheduled audit/report email and generated compliance evidence records |
| R36-R38 | Validated deployment retention, runtime branding, and custom-domain records |
| R39-R40 | New-user onboarding checklist and guided Product Console tour |
| R42 | Persisted saved-view/filter records |
| R46 | Dependency-free `cmd/platformctl` administrative CLI |
| R47 | Existing OpenTofu provider deployment surface plus REST/CLI product automation decision |
| R52-R55 | Explainable anomaly/risk scoring, passwordless magic links, and verified Google/GitHub OAuth |

R44 (Slack), R45 (Discord), and R56 (enterprise SSO) are intentionally outside
this delivery scope and remain unchecked in the backlog.

## Operations and security

OAuth is opt-in. Set the matching client ID and secret; an unconfigured
provider returns `503` without disabling password or magic-link login. Register
these exact callback paths with the provider:

- `${APP_PUBLIC_URL}/api/v1/auth/oauth/google/callback`
- `${APP_PUBLIC_URL}/api/v1/auth/oauth/github/callback`

Grafana's **Platform / services** dashboard contains the per-consumer
rate-limit decision panel. The consumer label is an authenticated subject ID;
unauthenticated traffic is aggregated as `anonymous` to avoid IP leakage and
unbounded metric cardinality.

Product token material and OAuth secrets must follow [Secrets](SECRETS.md).
Webhook targets must be public HTTPS URLs and are revalidated by the worker at
delivery time. Product payloads are limited to 64 KiB.
