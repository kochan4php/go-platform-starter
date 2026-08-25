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

Every Go service sets helmet-parity headers via `platform.SecurityHeaders`
(nosniff, frame-deny, referrer-policy, permissions-policy; HSTS when TLS).
CSP is deliberately not global — API responses are not HTML. The one HTML
surface (gateway `/docs`) ships its own CSP allowing the Scalar CDN bundle.

## Scanning

- `gosec` runs inside golangci-lint on every PR.
- Trivy (vuln + misconfig, HIGH/CRITICAL, failing) and semgrep `p/default`
  run in the CI `security` job.

## Secrets

- No secrets in code or compose defaults that matter: compose/k8s templates use
  obvious placeholder values; real values arrive via k8s Secrets rendered from
  `secret.tpl.yaml` files or CI credentials.
- Identity headers are bound by the shared internal secret — a leaked network
  position alone grants nothing (CONTRACTS.md).
