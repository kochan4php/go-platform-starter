# Contracts pipeline (spec-first)

Every service owns an OpenAPI spec at `services/<name>/openapi.yaml`. The spec is the
source of truth — server stubs are **generated** from it, never hand-routed.

```
services/<name>/openapi.yaml
        │  make contracts SVC=<name>          (oapi-codegen, chi std server)
        ▼
services/<name>/gen/…go                 ← committed? NO — generated in CI/build
        │  handlers implement gen.ServerInterface
        ▼
gateway composes every spec at boot → GET /docs/openapi.json (aggregate)
        │  openapi-typescript (apps/web build step)
        ▼
packages/contracts/src/client.d.ts      ← the web app's typed client
```

## Rules

1. A behavior that is not in a service's `openapi.yaml` does not exist.
2. Response bodies MUST use the shared envelope schemas (`#/components/schemas`
   copied from `_template/openapi.yaml`) so goldens stay comparable across services.
3. CI fails if generated code is stale (`make contracts && git diff --exit-code`).

## Adding an endpoint

```bash
# 1. edit services/<name>/openapi.yaml
# 2. regenerate + implement
make contracts SVC=<name>
$EDITOR services/<name>/internal/handlers.go
# 3. prove parity
make test SVC=<name>
```

The first real spec lands with Wave 1 (`services/auth/openapi.yaml`).
