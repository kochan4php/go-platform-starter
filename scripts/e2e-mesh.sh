#!/usr/bin/env bash
# Boots the full local mesh for the Playwright smoke (PLAN item 67):
# Postgres + Redis containers, all api services, gateway, and the four
# built web apps on preview servers. Requires: docker, go, pnpm.
# Usage: scripts/e2e-mesh.sh up | down
set -euo pipefail

cd "$(dirname "$0")/.."

PG_PORT="${E2E_PG_PORT:-55432}"
REDIS_PORT="${E2E_REDIS_PORT:-56379}"
AUTH_PORT="${E2E_AUTH_PORT:-8081}"
USERS_PORT="${E2E_USERS_PORT:-8082}"
RBAC_PORT="${E2E_RBAC_PORT:-8083}"
WORKER_PORT="${E2E_WORKER_PORT:-8084}"
GATEWAY_PORT="${E2E_GATEWAY_PORT:-8000}"
WEB_PORT="${E2E_WEB_PORT:-5173}"
AUTH_WEB_PORT="${E2E_AUTH_WEB_PORT:-5174}"
USERS_WEB_PORT="${E2E_USERS_WEB_PORT:-5175}"
RBAC_WEB_PORT="${E2E_RBAC_WEB_PORT:-5176}"
PIDS=()
export DATABASE_URL="postgres://app:app@127.0.0.1:${PG_PORT}/app?sslmode=disable"
export REDIS_ADDR="127.0.0.1:${REDIS_PORT}"
export ACCESS_TOKEN_SECRET="${ACCESS_TOKEN_SECRET:-e2e-secret-change-me-16+}"
export INTERNAL_SECRET="${INTERNAL_SECRET:-dev-internal-secret-change-me}"
export BCRYPT_COST="${BCRYPT_COST:-4}"
export APP_PUBLIC_URL="http://127.0.0.1:${WEB_PORT}"
export RBAC_INTERNAL_URL="http://127.0.0.1:${RBAC_PORT}"
export TRUSTED_DOMAINS="http://127.0.0.1:${WEB_PORT},http://127.0.0.1:${AUTH_WEB_PORT},http://127.0.0.1:${USERS_WEB_PORT},http://127.0.0.1:${RBAC_WEB_PORT}"
export UPSTREAMS="{\"auth\":\"http://127.0.0.1:${AUTH_PORT}\",\"users\":\"http://127.0.0.1:${USERS_PORT}\",\"rbac\":\"http://127.0.0.1:${RBAC_PORT}\",\"worker\":\"http://127.0.0.1:${WORKER_PORT}\"}"
export VITE_GATEWAY_URL="http://127.0.0.1:${GATEWAY_PORT}"
export E2E_REMOTE_AUTH_URL="http://127.0.0.1:${AUTH_WEB_PORT}/assets/remoteEntry.js"
export E2E_REMOTE_USERS_URL="http://127.0.0.1:${USERS_WEB_PORT}/assets/remoteEntry.js"
export E2E_REMOTE_RBAC_URL="http://127.0.0.1:${RBAC_WEB_PORT}/assets/remoteEntry.js"
export E2E_ADMIN_PASSWORD="${E2E_ADMIN_PASSWORD:-e2e-root-access-2026!}"

down() {
  if [ ${#PIDS[@]} -gt 0 ]; then
    kill "${PIDS[@]}" >/dev/null 2>&1 || true
    wait "${PIDS[@]}" >/dev/null 2>&1 || true
    if command -v powershell.exe >/dev/null 2>&1; then
      powershell.exe -NoProfile -Command \
        "\$ports=@(${AUTH_PORT},${USERS_PORT},${RBAC_PORT},${WORKER_PORT},${GATEWAY_PORT},${WEB_PORT},${AUTH_WEB_PORT},${USERS_WEB_PORT},${RBAC_WEB_PORT}); Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { \$_.LocalPort -in \$ports } | ForEach-Object { \$p=Get-CimInstance Win32_Process -Filter ('ProcessId=' + \$_.OwningProcess); if (\$p.CommandLine -like '*tmp\\e2e*' -or \$p.CommandLine -like '*vite.js*preview*') { Stop-Process -Id \$_.OwningProcess -Force -ErrorAction SilentlyContinue } }" \
        >/dev/null 2>&1 || true
    fi
  fi
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
    -e POSTGRES_DB=app -p "${PG_PORT}:5432" postgres:17-alpine >/dev/null
  docker run -d --name e2e-redis -p "${REDIS_PORT}:6379" redis:7-alpine >/dev/null
  until docker exec e2e-pg pg_isready -U app >/dev/null 2>&1; do sleep 1; done

  mkdir -p tmp/e2e
  for svc in auth users rbac gateway worker; do
    go build -o "tmp/e2e/${svc}.exe" "./services/${svc}"
  done
  go run ./services/auth -migrate
  go run ./services/users -migrate
  go run ./services/rbac -migrate
  go run ./services/worker -migrate
  ADMIN_BOOTSTRAP_PASSWORD="$E2E_ADMIN_PASSWORD" go run ./services/auth -seed
  go run ./services/rbac -seed

  PORT="$AUTH_PORT" tmp/e2e/auth.exe &
  PIDS+=("$!")
  PORT="$USERS_PORT" tmp/e2e/users.exe &
  PIDS+=("$!")
  PORT="$RBAC_PORT" tmp/e2e/rbac.exe &
  PIDS+=("$!")
  PORT="$WORKER_PORT" tmp/e2e/worker.exe &
  PIDS+=("$!")
  PORT="$GATEWAY_PORT" tmp/e2e/gateway.exe &
  PIDS+=("$!")

  for port in "$AUTH_PORT" "$USERS_PORT" "$RBAC_PORT" "$WORKER_PORT" "$GATEWAY_PORT"; do
    for _ in $(seq 1 40); do
      curl -sf "http://127.0.0.1:${port}/healthz" >/dev/null && break
      sleep 0.5
    done
    curl -sf "http://127.0.0.1:${port}/healthz" >/dev/null || { echo "service on :${port} never became healthy"; exit 1; }
  done

  corepack pnpm build
  corepack pnpm --filter web exec vite preview --port "$WEB_PORT" --strictPort & PIDS+=("$!")
  corepack pnpm --filter web-auth exec vite preview --port "$AUTH_WEB_PORT" --strictPort & PIDS+=("$!")
  corepack pnpm --filter web-admin-users exec vite preview --port "$USERS_WEB_PORT" --strictPort & PIDS+=("$!")
  corepack pnpm --filter web-admin-roles exec vite preview --port "$RBAC_WEB_PORT" --strictPort & PIDS+=("$!")
  for port in "$WEB_PORT" "$AUTH_WEB_PORT" "$USERS_WEB_PORT" "$RBAC_WEB_PORT"; do
    for _ in $(seq 1 40); do
      curl -sf "http://127.0.0.1:${port}/" >/dev/null && break
      sleep 0.5
    done
  done

  read -r -a playwright_args <<<"${PLAYWRIGHT_ARGS:-}"
  E2E_ADMIN_EMAIL="${E2E_ADMIN_EMAIL:-admin@example.local}" \
    E2E_GATEWAY_URL="http://127.0.0.1:${GATEWAY_PORT}" \
    E2E_BASE_URL="http://127.0.0.1:${WEB_PORT}" \
    corepack pnpm exec playwright test "${playwright_args[@]}"
  ;;
up)
  docker rm -f e2e-pg e2e-redis >/dev/null 2>&1 || true
  docker run -d --name e2e-pg -e POSTGRES_USER=app -e POSTGRES_PASSWORD=app \
    -e POSTGRES_DB=app -p "${PG_PORT}:5432" postgres:17-alpine >/dev/null
  docker run -d --name e2e-redis -p "${REDIS_PORT}:6379" redis:7-alpine >/dev/null
  until docker exec e2e-pg pg_isready -U app >/dev/null 2>&1; do sleep 1; done

  mkdir -p tmp/e2e
  for svc in auth users rbac gateway worker; do
    go build -o "tmp/e2e/${svc}.exe" "./services/${svc}"
  done
  go run ./services/auth -migrate
  go run ./services/users -migrate
  go run ./services/rbac -migrate
  go run ./services/worker -migrate
  ADMIN_BOOTSTRAP_PASSWORD="$E2E_ADMIN_PASSWORD" go run ./services/auth -seed
  go run ./services/rbac -seed

  PORT="$AUTH_PORT" tmp/e2e/auth.exe &
  PIDS+=("$!")
  PORT="$USERS_PORT" tmp/e2e/users.exe &
  PIDS+=("$!")
  PORT="$RBAC_PORT" tmp/e2e/rbac.exe &
  PIDS+=("$!")
  PORT="$WORKER_PORT" tmp/e2e/worker.exe &
  PIDS+=("$!")
  PORT="$GATEWAY_PORT" tmp/e2e/gateway.exe &
  PIDS+=("$!")
  for port in "$AUTH_PORT" "$USERS_PORT" "$RBAC_PORT" "$WORKER_PORT" "$GATEWAY_PORT"; do
    until curl -sf "http://127.0.0.1:${port}/healthz" >/dev/null; do sleep 0.5; done
  done

  corepack pnpm build
  corepack pnpm --filter web exec vite preview --port "$WEB_PORT" --strictPort & PIDS+=("$!")
  corepack pnpm --filter web-auth exec vite preview --port "$AUTH_WEB_PORT" --strictPort & PIDS+=("$!")
  corepack pnpm --filter web-admin-users exec vite preview --port "$USERS_WEB_PORT" --strictPort & PIDS+=("$!")
  corepack pnpm --filter web-admin-roles exec vite preview --port "$RBAC_WEB_PORT" --strictPort & PIDS+=("$!")
  for port in "$WEB_PORT" "$AUTH_WEB_PORT" "$USERS_WEB_PORT" "$RBAC_WEB_PORT"; do
    until curl -sf "http://127.0.0.1:${port}/" >/dev/null; do sleep 0.5; done
  done

  echo "mesh is up — run: E2E_ADMIN_EMAIL=admin@example.local E2E_ADMIN_PASSWORD=$E2E_ADMIN_PASSWORD corepack pnpm e2e"
  if [ "${WAIT:-}" = "1" ]; then wait; fi
  ;;
*) echo "usage: $0 up|down|ci" >&2; exit 1 ;;
esac
