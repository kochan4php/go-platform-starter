# API contract standards

The service-owned OpenAPI files define behavior. `scripts/compose-specs.mjs`
combines them and applies shared documentation once: tags, descriptions,
examples, standard errors, rate-limit/deprecation headers, idempotency, security
schemes, environment servers, links, event webhooks, and schema audits. CI runs
Spectral plus `scripts/check-contracts.mjs`; generated output must stay committed.

## Requests and collections

- JSON is the default representation. XML is deliberately unsupported. Uploads
  use `multipart/form-data`; downloads declare their exact media type and
  `Content-Disposition`.
- POST accepts an optional `Idempotency-Key` of at most 128 characters. The edge
  retains successful responses for 24 hours and rejects reuse with a different
  body. Bulk endpoints accept at most 100 unique items, run atomically unless
  documented otherwise, and return processed/existing or processed/failed sets.
- Collections use `limit`/`offset`; large ordered sets may additionally return an
  opaque `nextCursor`. `meta` always carries `limit`, `offset`, `total`, and
  optional `next`, `prev`, `nextCursor`, and `estimated` fields.
- Sorting is an allow-listed field plus `order=asc|desc`. Filtering uses named,
  typed parameters—no RSQL parser. `q` is full-text search, `fields` is a sparse
  fieldset, `include` selects documented related data, `ids` is batch get, and
  `count=exact|estimate|none` controls count cost.
- Long-running future operations return `202`, a `Location` header, and the
  shared `AsyncOperation` shape. No async endpoint is invented until work is
  actually queued.

## Responses, caching, and compatibility

- Success and errors use the English, machine-stable envelope. Error `message`
  is one of the centralized `platform.ErrorCodes`; human detail stays in
  `error`. Localization is a product decision and is not inferred from
  `Accept-Language`.
- The edge documents and emits `X-RateLimit-Limit`,
  `X-RateLimit-Remaining`, and `X-RateLimit-Reset`; a rejected request also has
  `Retry-After`. Deprecated operations set OpenAPI `deprecated: true`,
  `x-deprecated-at`, and `x-sunset`; the edge emits RFC 9745 `Deprecation` and
  `Sunset` headers.
- `/users/me` combines profile, roles, and permissions and supports ETag/304 with
  a short private cache. Mutations that later require optimistic concurrency
  will adopt `If-Match` only after that product decision is made.

## Platform and event surface

Every process exposes `/healthz`, `/readyz`, and `/version` from the shared
router. `healthz?detail=1` adds runtime metadata. `/metrics` is intentionally
excluded from the public OpenAPI document because it is a Prometheus scrape
surface protected by network policy.

The aggregate is OpenAPI 3.1 and declares `user.created`, `user.deleted`, and
`audit.entry` payloads with a discriminator plus webhook operations. Delivery is
at least once; consumers must be idempotent. SDK version equals aggregate
`info.version`; per-tag package subpaths and generated Zod request schemas keep
browser imports tree-shakeable.

Run `node scripts/api-changelog.mjs <base-sha>` to print added, changed, and
removed operations. Removal exits nonzero and must follow `docs/API_VERSIONING.md`.
