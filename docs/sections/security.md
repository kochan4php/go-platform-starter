---
title: Security
nav_order: 7
has_children: true
---

# Security

| Page | Read it when |
| --- | --- |
| [Security posture](../SECURITY.md) | You want what is actually enforced, including the single cookie in the system. |
| [Threat model](../THREAT_MODEL.md) | You are adding a trust boundary, or crossing one. |
| [Token policy](../TOKEN_POLICY.md) | You are touching access or refresh tokens. Normative for every `apps/*` component. |
| [Secrets](../SECRETS.md) | You are adding configuration that must not appear in a log or an image layer. |
| [Pentest checklist](../PENTEST_CHECKLIST.md) | You are testing — against an isolated environment with synthetic data. |
| [Break glass](../BREAK_GLASS.md) | Normal RBAC administration is unavailable and an outage demands it. Nothing less. |

## Where authorization actually happens

The gateway verifies the JWT once at the edge and forwards identity headers
bound by `INTERNAL_SECRET`. Downstream services trust those headers and never
re-verify, which is why nothing may reach a service except through the gateway.

The access token lives in browser memory; the refresh token lives in an httpOnly
cookie with rotation and reuse detection. `<RequirePermission>` in the UI is a
hint for rendering — it is never authorization.
