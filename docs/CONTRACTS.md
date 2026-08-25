# Contracts pipeline (spec-first)

Every service owns an OpenAPI spec at `services/<name>/openapi.yaml`. The spec is the
source of truth — server stubs are **generated** from it, never hand-routed.

```
services/<name>/openapi.yaml
        │  make contracts SVC=<name>          (pinned oapi-codegen via go.mod tool directive)
        ▼
services/<name>/gen/gen.go              ← committed; CI fails if stale
        │  handlers implement gen.ServerInterface
        ▼
gateway composes every spec at boot → GET /docs/openapi.json (aggregate, Scalar UI)
        │  same aggregate composed statically from services/*/openapi.yaml at build time
        ▼
packages/contracts                      ← the web app's typed client (openapi-typescript)
```

## Rules

1. A behavior that is not in a service's `openapi.yaml` does not exist.
2. Response bodies MUST use the shared envelope schemas copied from
   `services/_template/openapi.yaml` so shapes stay identical across services:
   `{"success":true,"message":"…","data":…}` / `{"success":false,"message":"…","error":"…"}`,
   lists wrapping data as `{"items":[…],"meta":{"limit":…,"offset":…,"total":…}}`.
3. Protect an operation with `x-required-permission: "<resource>:<action>:<scope>"`;
   leave it absent for public routes. The gateway's fail-closed registry validates that
   every annotated permission exists in the compile-time catalog at boot.
   Routes needing a valid JWT *without* a specific permission annotate `x-auth: required`
   instead — the gateway verifies the token and forwards identity, no permission check.
4. CI fails on stale generated code (`make contracts SVC=<name> && git diff --exit-code`).

## Identity-header contract

The gateway verifies JWTs once and forwards downstream:

| Header | Meaning |
| --- | --- |
| `X-User-Id` | subject (`sub`) of the access token |
| `X-Email` | email claim |
| `Authorization` | original bearer header, passed through untouched |

- Claims are never copied into additional headers (bounds header size).
- Downstream services reject any request carrying `X-User-Id`/`X-Email` **without** the
  shared internal-secret header used by internal APIs — a leaked network position alone
  grants nothing.
- Services never re-verify tokens.

## Data-split contract

| Service | Schema | Owns | Never holds |
| --- | --- | --- | --- |
| auth | `auth` | credentials: email, password_hash, status, lockout columns; sessions | profile fields |
| users | `users` | profile rows keyed by `sub`: display name, avatar… | credentials |

Lifecycle rides Redis Streams:

| Event | Emitted by | Consumed by | Effect |
| --- | --- | --- | --- |
| `user.created` | auth (register, bootstrap seeder) | users | materialize profile row |
| `user.deleted` | users (admin delete) | users + auth | hard-delete profile row; purge credentials + sessions |

Consumer groups start at stream beginning (`0`) so events emitted before a consumer's
first deploy backfill. Payload schemas for these events are versioned in this file when
the first real producer lands.

## Stream payload contracts

All events ride the envelope `{event: string, payload: string}` where `payload` is the
JSON encoding described below (see `internal/platform.Publish`).

### `users.events`

| Event | Producer | Payload |
| --- | --- | --- |
| `user.created` | auth (register, bootstrap seeder) | `{sub, email}` |
| `user.deleted` | users (admin delete) | `{sub}` |

### `mail.jobs` (consumed by worker)

| Event | Producer | Payload |
| --- | --- | --- |
| `email.send` | auth | `{to, subject, html}` |

Delivery is **at-least-once**; the worker marks a message done only after a successful
SMTP send, so redeliveries never double-send. After 5 failed attempts a job moves to
`<stream>:dlq` with its original id preserved for inspection.

### `audit.events` (consumed by worker — sole writer of schema `audit`)

| Event | Producers | Payload |
| --- | --- | --- |
| `audit.entry` | any api service | `{actorSub, action, entity, entityId?, meta?}` |

Flushes are idempotent per Redis message id (`msg_id` unique index + `ON CONFLICT DO
NOTHING`), so at-least-once redelivery cannot duplicate rows.

### `purge:profiles` (Redis list)

Belt-and-braces beside `user.deleted`: every admin delete also pushes the `sub` onto
this durable list; the users service's scheduled sweep drains it and deletes any
profile rows the stream path missed.

