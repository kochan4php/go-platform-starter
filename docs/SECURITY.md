# Security posture

## Cookies & CSRF

The only cookies in the system are the auth service's `refresh_token` cookie
(`httpOnly`, `SameSite=Lax`, `Secure` when `COOKIE_SECURE=true`). CSRF
exposure is bounded by construction:

1. **Cookie-bearing endpoints are POST-only** (`/auth/refresh`, `/auth/logout`,
   and login which sets the cookie). No state-changing GET exists.
2. **JSON-only bodies**: cross-site form posts send `text/plain` /
   `application/x-www-form-urlencoded`; handlers decode JSON bodies, so a
   forged form submit yields a binding error before any effect.
3. **SameSite=Lax** blocks the cookie on cross-site POST navigations outright.
4. The access token is never in a cookie (see TOKEN_POLICY.md), so forged
   top-level requests cannot authorize API calls beyond the cookie endpoints.

If an endpoint ever needs to accept cookie auth with side effects from
non-JSON content types, add an Origin/Referer allowlist check against
TRUSTED_DOMAINS at the gateway first — that's the trigger, noted here.

## Headers

Every Go service sets helmet-parity headers via `platform.SecurityHeaders`.
The nginx edge adds a complete CSP, COOP/COEP/CORP, granular
Permissions-Policy, two-year preload HSTS on TLS, and a strict referrer policy.
Scalar is version-pinned with SRI; Cabinet Grotesk is bundled locally.

## Scanning

- `gosec` runs inside golangci-lint on every PR.
- Trivy vulnerability and Kubernetes config scans, default and project Semgrep
  rules, gitleaks, SBOM generation, and dependency-license policy run in CI.

## Secrets

- Secrets accept `NAME_FILE` and rotating key rings; production templates use
  External Secrets/Vault and API-server KMS encryption.
- Identity headers are bound by the shared internal secret — a leaked network
  position alone grants nothing (CONTRACTS.md).

## Kubernetes network boundary

`infra/k8s/security/network-policies.yaml` starts with default-deny. Before
exposing the stack, label only the ingress-controller namespace with
`networking.platform/ingress=allowed`; that namespace can reach gateway and
web pods, while service, data-store, DNS, and approved public egress remain
separately scoped.

See `SECRETS.md`, `THREAT_MODEL.md`, `PENTEST_CHECKLIST.md`, and the root
`SECURITY.md` responsible-disclosure policy.
