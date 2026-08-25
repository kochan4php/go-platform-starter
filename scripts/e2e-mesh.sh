#!/usr/bin/env bash
# Boots the full local mesh for the Playwright smoke (PLAN item 67):
# Postgres + Redis containers, all api services, gateway, and the four
# built web apps on preview servers. Requires: docker, go, pnpm.
# Usage: scripts/e2e-mesh.sh up | down
set -euo pipefail

cd "$(dirname "$0")/.."

PG_PORT=55432 REDIS_PORT=56379
export DATABASE_URL="postgres://app:app@localhost:${PG_PORT}/app?sslmode=disable"
export REDIS_ADDR="localhost:${REDIS_PORT}"
export ACCESS_TOKEN_SECRET="${ACCESS_TOKEN_SECRET:-e2e-secret-change-me-16+}"
export INTERNAL_SECRET="${INTERNAL_SECRET:-dev-internal-secret-change-me}"
export APP_PUBLIC_URL="http://localhost:5173"
export RBAC_INTERNAL_URL="http://localhost:8083"
export TRUSTED_DOMAINS="http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:5176"
export UPSTREAMS='{"auth":"http://localhost:8081","users":"http://localhost:8082","rbac":"http://localhost:8083"}'
export E2E_ADMIN_PASSWORD="${E2E_ADMIN_PASSWORD:-e2e-admin-password-1}"

down() {
  docker rm -f e2e-pg e2e-redis >/dev/null 2>&1 || true
}

case "${1:-up}" in
down) down ;;
ci)
  # One-shot CI mode: boot the whole mesh, run the smoke journey, tear down.
  # Everything runs inside this process tree; failures propagate.
  trap 'down' EXIT

  docker rm -f e2e-pg e2e-redis >/dev/null 2>&1 || true
  docker run -d --name e2e-pg -e POSTGRES_USER=app -e POSTGRES_PASSWORD=app \
    -e POSTGRES_DB=app -p ${PG_PORT}:5432 postgres:17-alpine >/dev/null
  docker run -d --name e2e-redis -p ${REDIS_PORT}:6379 redis:7-alpine >/dev/null
  until docker exec e2e-pg pg_isready -U app >/dev/null 2>&1; do sleep 1; done

  mkdir -p tmp/e2e
  for svc in auth users rbac gateway; do
    go build -o "tmp/e2e/${svc}.exe" "./services/${svc}"
  done
  go run ./services/auth -migrate
  go run ./services/users -migrate
  go run ./services/rbac -migrate
  ADMIN_BOOTSTRAP_PASSWORD="$E2E_ADMIN_PASSWORD" go run ./services/auth -seed
  go run ./services/rbac -seed

  PORT=8081 tmp/e2e/auth.exe &
  PORT=8082 tmp/e2e/users.exe &
  PORT=8083 tmp/e2e/rbac.exe &
  PORT=8000 tmp/e2e/gateway.exe &

  for port in 8081 8082 8083 8000; do
    for i in $(seq 1 40); do
      curl -sf "http://localhost:${port}/healthz" >/dev/null && break
      sleep 0.5
    done
    curl -sf "http://localhost:${port}/healthz" >/dev/null || { echo "service on :${port} never became healthy"; exit 1; }
  done

  pnpm build
  pnpm --filter web exec vite preview --port 5173 --strictPort &
  pnpm --filter web-auth exec vite preview --port 5174 --strictPort &
  pnpm --filter web-admin-users exec vite preview --port 5175 --strictPort &
  pnpm --filter web-admin-roles exec vite preview --port 5176 --strictPort &
  for port in 5173 5174 5175 5176; do
    for i in $(seq 1 40); do
      curl -sf "http://localhost:${port}/" >/dev/null && break
      sleep 0.5
    done
  done

  E2E_ADMIN_EMAIL="${E2E_ADMIN_EMAIL:-admin@example.local}" \
    pnpm exec playwright test
  ;;
up)
  docker rm -f e2e-pg e2e-redis >/dev/null 2>&1 || true
  docker run -d --name e2e-pg -e POSTGRES_USER=app -e POSTGRES_PASSWORD=app \
    -e POSTGRES_DB=app -p ${PG_PORT}:5432 postgres:17-alpine >/dev/null
  docker run -d --name e2e-redis -p ${REDIS_PORT}:6379 redis:7-alpine >/dev/null
  until docker exec e2e-pg pg_isready -U app >/dev/null 2>&1; do sleep 1; done

  mkdir -p tmp/e2e
  for svc in auth users rbac gateway; do
    go build -o "tmp/e2e/${svc}.exe" "./services/${svc}"
  done
  go run ./services/auth -migrate
  go run ./services/users -migrate
  go run ./services/rbac -migrate
  ADMIN_BOOTSTRAP_PASSWORD="$E2E_ADMIN_PASSWORD" go run ./services/auth -seed
  go run ./services/rbac -seed

  PORT=8081 tmp/e2e/auth.exe &
  PORT=8082 tmp/e2e/users.exe &
  PORT=8083 tmp/e2e/rbac.exe &
  PORT=8000 tmp/e2e/gateway.exe &
  for port in 8081 8082 8083 8000; do
    until curl -sf "http://localhost:${port}/healthz" >/dev/null; do sleep 0.5; done
  done

  pnpm build
  pnpm --filter web exec vite preview --port 5173 --strictPort &
  pnpm --filter web-auth exec vite preview --port 5174 --strictPort &
  pnpm --filter web-admin-users exec vite preview --port 5175 --strictPort &
  pnpm --filter web-admin-roles exec vite preview --port 5176 --strictPort &
  for port in 5173 5174 5175 5176; do
    until curl -sf "http://localhost:${port}/" >/dev/null; do sleep 0.5; done
  done

  echo "mesh is up — run: E2E_ADMIN_EMAIL=admin@example.local E2E_ADMIN_PASSWORD=$E2E_ADMIN_PASSWORD pnpm e2e"
  if [ "${WAIT:-}" = "1" ]; then wait; fi
  ;;
*) echo "usage: $0 up|down|ci" >&2; exit 1 ;;
esac
