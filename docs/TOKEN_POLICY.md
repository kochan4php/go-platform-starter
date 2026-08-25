# Token storage policy

Status: normative for every `apps/*` component (PLAN item 69).

## Access token

- **Memory only** — held by `@starter/contracts` (`setAccessToken`), attached
  to requests by the fetch middleware.
- Never stored in `localStorage`, `sessionStorage`, or a readable cookie.
- Dies with the page; a reload restores the session via silent refresh, never
  from storage.

## Refresh token

- **httpOnly cookie** named `refresh_token`, owned by the auth service and
  set through the gateway (`SameSite=Lax`; `Secure` when `COOKIE_SECURE=true`).
- JavaScript cannot read it — XSS cannot exfiltrate it.
- Rotation on every use; replay of an old refresh token kills the whole
  session family server-side.

## Flow

1. `POST /api/v1/auth/login` → access token in response body, refresh cookie set.
2. Every API call: `Authorization: Bearer <memory token>`.
3. On `401`: one silent `POST /api/v1/auth/refresh` (cookie rides along) →
   new memory token → retry the original call once. Failure ⇒ signed out.
4. On boot: the same silent refresh decides whether a session exists.
5. `POST /api/v1/auth/logout` revokes the session family and clears the cookie.

The UI reads claims (`sub`, `email`, `perms[]`, `ver`) from the access token
purely as display hints (`RequirePermission`). The gateway's fail-closed
registry is the real enforcement point.
