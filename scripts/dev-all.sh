#!/usr/bin/env bash
#
# Native development orchestrator: boots EVERY microservice and microfrontend
# as local processes with hot reload, for fast iteration and debugging.
#
#   ./scripts/dev-all.sh              # start everything (attached)
#   ./scripts/dev-all.sh -d           # start detached (logs under tmp/dev/)
#   ./scripts/dev-all.sh status       # per-component up/down table
#   ./scripts/dev-all.sh logs [name]  # tail one or all component logs
#   ./scripts/dev-all.sh down         # stop all processes
#   ./scripts/dev-all.sh down --infra # ...and stop postgres/redis containers
#
# Prerequisites: Go >= 1.27, Node >= 22 with pnpm, Docker for Postgres/Redis.
# The script starts the database containers itself (shared project namespace
# with the lab stack) and seeds roles + a bootstrap admin idempotently.
#
# Access points once healthy:
#   shell        http://127.0.0.1:5173      (vite dev, hot reload)
#   remotes      :5174 web-auth · :5175 admin-users · :5176 admin-roles
#   gateway      http://127.0.0.1:8010      (/docs for the aggregate spec)
#   services     auth :8081 · users :8082 · rbac :8083 · worker :8084 · realtime :8085 · scheduler :8086
#   admin login  admin@example.local / local-root-access-2026!
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$ROOT/tmp/dev/logs"
PID_FILE="$ROOT/tmp/dev/pids"
mkdir -p "$LOG_DIR"

MODE="up"; DETACH=0; STOP_INFRA=0; NO_SEED=0
for arg in "$@"; do
  case "$arg" in
    -d|--detach) DETACH=1 ;;
    --no-seed) NO_SEED=1 ;;
    down) MODE="down" ;;
    status) MODE="status" ;;
    logs) MODE="logs" ;;
    --infra) STOP_INFRA=1 ;;
    *) echo "unknown argument: $arg" >&2; exit 1 ;;
  esac
done

SERVICES=(
  "auth|8081|./services/auth"
  "users|8082|./services/users"
  "rbac|8083|./services/rbac"
  "worker|8084|./services/worker"
  "realtime|8085|./services/realtime"
  "scheduler|8086|./services/scheduler"
)
WEB_APPS=(
  "web|5173"
  "web-auth|5174"
  "web-admin-users|5175"
  "web-admin-roles|5176"
)
MANAGED_PORTS=(8000 8081 8082 8083 8084 8085 8086 5173 5174 5175 5176)

WIN=0
command -v powershell.exe > /dev/null 2>&1 && WIN=1

# Resolve pnpm: use it directly if on PATH, otherwise fall back to npx pnpm.
PNPM="pnpm"
command -v pnpm > /dev/null 2>&1 || PNPM="npx --yes pnpm"

log() { printf '\033[1;36m[dev]\033[0m %s\n' "$*"; }
die() { printf '\033[1;31m[dev] FATAL: %s\033[0m\n' "$*" >&2; exit 1; }

# --- port helpers ---------------------------------------------------------------
# On Windows, MSYS pid semantics make process checks lie, so listener state is
# queried from the OS TCP table instead. POSIX path uses bash /dev/tcp.
port_busy() {
  local port="$1"
  if [ "$WIN" = "1" ]; then
    powershell.exe -NoProfile -Command "
      if (Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue) { exit 0 } else { exit 1 }
    " >/dev/null 2>&1
    return $?
  fi
  (exec 3<>"/dev/tcp/127.0.0.1/$port") 2>/dev/null || return 1
  exec 3>&- 3<&- 2>/dev/null || true
  return 0
}

# Force-stop only OUR OWN dev processes. Never kill by bare port ownership:
# on Docker Desktop the owner of a published port is com.docker.backend, and
# killing it takes the whole daemon down.
kill_managed() {
  if [ "$WIN" = "1" ]; then
    powershell.exe -NoProfile -ExecutionPolicy Bypass \
      -File "$ROOT/scripts/stop-dev.ps1" >/dev/null 2>&1 || true
  else
    pkill -f 'tmp/dev/bin/(auth|users|rbac|worker|realtime|scheduler|gateway)' 2>/dev/null || true
    pkill -f 'vite --port 517' 2>/dev/null || true
  fi
  if [ -f "$PID_FILE" ]; then
    while read -r pid; do kill "$pid" 2>/dev/null || true; done < "$PID_FILE"
    rm -f "$PID_FILE"
  fi
}

# Detect host ports already published by OTHER docker containers — the common
# collision case for 5432/6379.
docker_publishes() {
  docker ps --format '{{.Ports}}' 2>/dev/null | grep -qE ":$1->"
}

pick_port() {
  local preferred="$1" candidate="$2"
  if docker_publishes "$preferred"; then
    log "host port $preferred already published by another container — using $candidate" >&2
    echo "$candidate"
  else
    echo "$preferred"
  fi
}

compose_infra() {
  docker compose -f "$ROOT/infra/compose.base.yml" "$@"
}

# --- shared environment ----------------------------------------------------------
# Host-side ports default to collision-free values; override via env.
LAB_PG_PORT="${LAB_PG_PORT:-55432}"
LAB_REDIS_PORT="${LAB_REDIS_PORT:-56380}"
LAB_GATEWAY_PORT="${LAB_GATEWAY_PORT:-8010}"
export LAB_PG_PORT LAB_REDIS_PORT LAB_GATEWAY_PORT
export DATABASE_URL="postgres://app:app@127.0.0.1:${LAB_PG_PORT}/app?sslmode=disable"
export REDIS_ADDR="127.0.0.1:${LAB_REDIS_PORT}"
export ACCESS_TOKEN_SECRET="${ACCESS_TOKEN_SECRET:-dev-secret-change-me-16+}"
export INTERNAL_SECRET="${INTERNAL_SECRET:-dev-internal-secret-change-me}"
export APP_PUBLIC_URL="${APP_PUBLIC_URL:-http://127.0.0.1:5173}"
export RBAC_INTERNAL_URL="${RBAC_INTERNAL_URL:-http://127.0.0.1:8083}"
export TRUSTED_DOMAINS="${TRUSTED_DOMAINS:-http://127.0.0.1:5173,http://127.0.0.1:5174,http://127.0.0.1:5175,http://127.0.0.1:5176}"
export ADMIN_BOOTSTRAP_PASSWORD="${ADMIN_BOOTSTRAP_PASSWORD:-local-root-access-2026!}"
# Vite reads this at request time; without it the apps would fall back to
# same-origin and miss the gateway listening on its own dev port.
export VITE_GATEWAY_URL="${VITE_GATEWAY_URL:-http://127.0.0.1:$LAB_GATEWAY_PORT}"

PIDS=()
cleanup() {
  log "shutting down ($(date +%H:%M:%S))"
  for pid in "${PIDS[@]:-}"; do kill "$pid" 2>/dev/null || true; done
  rm -f "$PID_FILE"
}

case "$MODE" in
  down)
    trap - EXIT INT TERM
    kill_managed
    # The lab stack shares every port with dev — it must not survive a down.
    (cd "$ROOT/infra" && docker compose -p go-platform-lab -f compose.base.yml -f compose.lab.yml down >/dev/null 2>&1) || true
    if [ "$STOP_INFRA" = "1" ]; then
      compose_infra down -v >/dev/null 2>&1 || true
      log "processes stopped, lab stack and infra containers removed (volumes wiped)"
    else
      log "processes stopped (lab containers down; postgres/redis volumes kept)"
    fi
    exit 0
    ;;
  status)
    for spec in "${SERVICES[@]}"; do IFS='|' read -r name port _ <<<"$spec"
      port_busy "$port" && echo "$name     :$port  up" || echo "$name     :$port  down"
    done
    port_busy "$LAB_GATEWAY_PORT" && echo "gateway  :$LAB_GATEWAY_PORT  up" || echo "gateway  :$LAB_GATEWAY_PORT  down"
    for spec in "${WEB_APPS[@]}"; do IFS='|' read -r name port <<<"$spec"
      port_busy "$port" && echo "$name  :$port  up" || echo "$name  :$port  down"
    done
    exit 0
    ;;
  logs)
    tail -n 80 -F "$LOG_DIR/${1:-*}.log"
    exit 0
    ;;
esac

# --- up --------------------------------------------------------------------------
log "checking managed ports"
for port in "$LAB_GATEWAY_PORT" 8081 8082 8083 8084 8085 8086 5173 5174 5175 5176; do
  if port_busy "$port"; then
    die "port $port already has a listener — the LAB stack or a previous dev-all is probably still up. Stop it: ./scripts/deploy-lab.sh --down  (or: ./scripts/dev-all.sh down)"
  fi
done

log "resolving lab container host ports (pg=$LAB_PG_PORT redis=$LAB_REDIS_PORT)"

log "starting infrastructure containers"
compose_infra up -d postgres redis > /dev/null
until compose_infra exec -T postgres pg_isready -U app > /dev/null 2>&1; do sleep 1; done
log "infrastructure ready"

mkdir -p "$ROOT/tmp/dev/bin"

# Build all service binaries first (parallel build, no race yet)
log "building service binaries"
build_pids=()
for spec in "${SERVICES[@]}"; do IFS='|' read -r name port dir <<< "$spec"
  (cd "$ROOT" && go build -o "tmp/dev/bin/$name" "$dir") & build_pids+=($!)
done
(cd "$ROOT" && go build -o tmp/dev/bin/gateway ./services/gateway) & build_pids+=($!)
for pid in "${build_pids[@]}"; do wait "$pid" || die "build failed (see above)"; done
log "all binaries built"

# Run DB migrations sequentially BEFORE launching any service.
# This avoids the race where services crash (os.Exit) on migrate failure
# before ever binding to their port, causing /healthz to time out.
log "running migrations (sequential)"
for spec in "${SERVICES[@]}"; do IFS='|' read -r name port dir <<< "$spec"
  case "$name" in realtime|scheduler) continue ;; esac   # infrastructure services own no migrations
  log "  migrate: $name"
  (cd "$ROOT" && ./tmp/dev/bin/"$name" -migrate > "$LOG_DIR/$name-migrate.log" 2>&1) \
    || die "migration failed for $name — check $LOG_DIR/$name-migrate.log"
done
log "migrations done"

launch_service() {
  local name="$1" port="$2"
  (cd "$ROOT" && PORT="$port" ./tmp/dev/bin/"$name" > "$LOG_DIR/$name.log" 2>&1) &
  PIDS+=($!)
  log "service $name -> :$port"
}

launch_gateway() {
  (
    cd "$ROOT"
    PORT="$LAB_GATEWAY_PORT" \
    UPSTREAMS='{"auth":"http://127.0.0.1:8081","users":"http://127.0.0.1:8082","rbac":"http://127.0.0.1:8083","worker":"http://127.0.0.1:8084"}' \
    REALTIME_UPSTREAM=http://127.0.0.1:8085 \
    ./tmp/dev/bin/gateway > "$LOG_DIR/gateway.log" 2>&1
  ) &
  PIDS+=($!)
  log "gateway -> :$LAB_GATEWAY_PORT"
}

launch_web() {
  local name="$1" port="$2"
  (cd "$ROOT/apps/$name" && $PNPM exec vite --host 127.0.0.1 --port "$port" --strictPort > "$LOG_DIR/$name.log" 2>&1) &
  PIDS+=($!)
  log "web app $name -> :$port"
}

for spec in "${SERVICES[@]}"; do IFS='|' read -r name port dir <<< "$spec"; launch_service "$name" "$port"; done
launch_gateway

if [ "$NO_SEED" = "0" ]; then
  log "seeding (idempotent)"
  (cd "$ROOT" && go run ./services/rbac -seed >/dev/null 2>&1 && echo "  ok: rbac-seed") || true
  (cd "$ROOT" && go run ./services/auth -seed >/dev/null 2>&1 && echo "  ok: auth-seed") || true
fi

log "starting microfrontends (vite dev)"
for spec in "${WEB_APPS[@]}"; do IFS='|' read -r name port <<<"$spec"; launch_web "$name" "$port"; done

log "waiting for every endpoint to report healthy"
for url in \
  http://127.0.0.1:8081/healthz http://127.0.0.1:8082/healthz http://127.0.0.1:8083/healthz \
  http://127.0.0.1:8084/healthz http://127.0.0.1:8085/healthz http://127.0.0.1:8086/healthz "http://127.0.0.1:${LAB_GATEWAY_PORT}/healthz" \
  http://127.0.0.1:5173/ http://127.0.0.1:5174/; do
  ok=0
  for _ in $(seq 1 60); do
    curl -sf -o /dev/null "$url" && { ok=1; break; }
    sleep 1
  done
  [ "$ok" = "1" ] || die "endpoint never became ready: $url (see tmp/dev/logs/)"
done

log "everything is up"
cat <<SUMMARY

  Shell        http://127.0.0.1:5173        (hot reload)
  Remotes      :5174 auth · :5175 users · :5176 roles
  Gateway      http://127.0.0.1:${LAB_GATEWAY_PORT}/docs   (aggregate API reference)
  Services     auth :8081 · users :8082 · rbac :8083 · worker :8084 · realtime :8085 · scheduler :8086
  Admin login  admin@example.local / local-root-access-2026!
  Logs         tmp/dev/logs/<name>.log      (or: ./scripts/dev-all.sh logs [name])

  Attached mode: press Ctrl-C to stop everything.
SUMMARY

if [ "$DETACH" = "1" ]; then
  trap - EXIT INT TERM
  write_pids() { printf '%s\n' "$@" > "$PID_FILE"; }
  write_pids "${PIDS[@]}"
  disown -a 2>/dev/null || true
  log "detached — stop later with ./scripts/dev-all.sh down"
  exit 0
fi

wait
