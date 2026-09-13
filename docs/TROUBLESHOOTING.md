# Troubleshooting

Start with the smallest failing boundary. Preserve timestamps, request IDs, and
trace IDs; redact secrets and personal data before sharing logs.

## Local mesh does not start

1. Run `docker compose version` and `docker info`.
2. Run `./scripts/dev-all.sh status` or
   `docker compose -f infra/compose.base.yml -f infra/compose.lab.yml ps`.
3. Check host-port conflicts against [the generated port table](reference/PORTS.md).
4. Inspect one component: `./scripts/dev-all.sh logs gateway` or
   `docker compose ... logs --tail=200 gateway`.
5. Re-run `./scripts/deploy-lab.sh`; do not delete volumes unless data loss is
   acceptable and the target path has been verified.

## Hard refresh returns 404 or loses the session

Use `127.0.0.1` consistently for every development origin. Mixing `localhost`
and `127.0.0.1` changes cookie scope. The edge/nginx must serve `index.html` for
unknown frontend routes, while `/api`, `/docs`, and `/ws` retain their explicit
proxies. Confirm `/config.js` points to the same gateway origin.

## Gateway rejects a route or refuses to boot

- Run `pnpm contracts && pnpm test:contracts`.
- Verify `operationId`, `x-required-permission`, and the permission catalog.
- A route absent from OpenAPI is intentionally unreachable.
- Check `UPSTREAMS` and each upstream `/readyz` response.

## Authentication loops or refresh fails

- Confirm browser cookies are sent to the same origin and the device ID is
  stable.
- Check auth session state, `ACCESS_TOKEN_SECRET` key ring, and Redis health.
- Refresh-token reuse revokes the entire family by design. Log in again instead
  of replaying an old token.

## Tests fail before running containers

On Windows, Testcontainers requires a supported Docker Desktop provider. Verify
`docker info` from the same shell. If rootless-provider detection fails, run
unit/compile checks with `go test ./... -run '^$'` and fix Docker before claiming
the integration suite passed.

## Generated files are stale

```sh
pnpm contracts
go run ./cmd/dbdocs
node scripts/generate-docs.mjs
graphify update .
```

Then run `git diff --check` and review every generated change.

## Database or Redis is slow

Use request/trace IDs in Grafana, then inspect `pg_stat_statements`, slow-query
logs, Redis latency, stream lag, and pool saturation. Follow
[performance evidence](PERFORMANCE.md) and [on-call actions](ONCALL.md); do not
raise timeouts before finding the constrained resource.
