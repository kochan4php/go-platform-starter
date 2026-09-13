# API versioning policy

## The contract

- **`/api/v1` is frozen**: a route that ships in `/api/v1` keeps its request
  and response shapes until its removal is announced through at least one
  minor deprecation window. No silent breaking changes.
- Additive changes (new optional fields, new routes, new permissions) are
  **not** breaking and may land any time.
- The OpenAPI spec per service is the source of truth. If the spec says it,
  clients may rely on it; if the code does something the spec doesn't say,
  the code is wrong.

## Deprecation mechanics

1. Mark responses with the RFC-9745 headers using
   `platform.Deprecation(w, at, sunset)` (`internal/platform/security.go`).
2. Announce in release notes + `docs/CONTRACTS.md`.
3. Keep the old shape for **≥90 days** after the deprecation announcement.
4. Removal lands only in a major wave boundary, never mid-wave.

## Adding v2 (when it's ever needed)

- New services may start at `/api/v2` directly; existing services add `/api/v2`
  routes alongside v1 during the overlap window.
- The gateway registry handles both: specs annotate their own paths, prefixes
  are mechanical. Consumers migrate per-route, not big-bang.

## What this policy deliberately avoids

- Per-consumer version negotiation headers — overkill while all consumers are
  first-party frontends.
- Long-lived public SDKs — `packages/contracts` regenerates from the aggregate
  spec on every build, so clients are always in sync.
