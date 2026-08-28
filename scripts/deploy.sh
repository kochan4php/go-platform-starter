#!/usr/bin/env bash
#
# Multi-environment auto-deploy for go-platform-starter (single VPS or local
# docker, docker compose based).
#
# Usage:
#   ./scripts/deploy.sh <environment> [flags]
#
# Environments:
#   lab    Local development stack (compose.base + compose.lab overlay):
#          every port published, debug logging, console mailer, seeds on.
#   uat    Acceptance-testing VPS deployment  (infra/.env.uat)
#   demo   Stakeholder demo VPS deployment    (infra/.env.demo)
#   prod   Production VPS deployment          (infra/.env.production)
#
# Flags:
#   --no-pull         Skip the git fetch/reset step (local edits)
#   --skip-build      Reuse existing images, do not rebuild
#   --down            Stop and remove the target stack
#   --install-docker  Install Docker + compose plugin on apt systems first
#
# Environment variables: DOMAIN, ADMIN_EMAIL, SEED_ADMIN, BRANCH, ENV_FILE.
#
# What a deploy does:
#   1. verifies docker + compose plugin (offers install on apt systems)
#   2. fast-forwards the repo to origin/$BRANCH
#   3. creates infra/.env.<env> with random secrets on first run (uat/demo/prod)
#   4. builds all images (cache-aware)
#   5. runs schema migrations as one-shot jobs BEFORE the rollout
#   6. starts/replaces services (edge nginx is the only public entry for
#      uat/demo/prod; lab publishes every port for direct access)
#   7. seeds the role catalog + bootstrap admin (idempotent)
#   8. gates on health endpoints before declaring success
#
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BRANCH="${BRANCH:-main}"
SKIP_PULL=0 SKIP_BUILD=0 WANT_DOWN=0 INSTALL_DOCKER=0

TARGET=""
for arg in "$@"; do
  case "$arg" in
    lab|uat|demo|prod) TARGET="$arg" ;;
    --no-pull) SKIP_PULL=1 ;;
    --skip-build) SKIP_BUILD=1 ;;
    --build) FORCE_BUILD=1 ;;
    --down) WANT_DOWN=1 ;;
    --install-docker) INSTALL_DOCKER=1 ;;
    *) echo "unknown argument: $arg" >&2; exit 1 ;;
  esac
done
[ -n "$TARGET" ] || { sed -n '3,20p' "${BASH_SOURCE[0]}"; exit 1; }

log() { printf '\n\033[1;36m==> [%s] %s\033[0m\n' "$TARGET" "$*"; }
die() { printf '\n\033[1;31mFATAL: %s\033[0m\n' "$*" >&2; exit 1; }

cd "$REPO_DIR"

# --- per-target wiring ---------------------------------------------------------
ENV_FILE="${ENV_FILE:-$REPO_DIR/infra/.env.$TARGET}"

case "$TARGET" in
  lab)
    # Lab runs from the base mesh + overlay; env file optional (dev defaults
    # live in infra/go.env). No git pull by default — it is a local sandbox.
    SKIP_PULL=1
    COMPOSE_FILES=(-f "$REPO_DIR/infra/compose.base.yml" -f "$REPO_DIR/infra/compose.lab.yml")
    ;;
  uat|demo|prod)
    COMPOSE_FILES=(-f "$REPO_DIR/infra/compose.prod.yml")
    ;;
esac

compose() {
  if [ -f "$ENV_FILE" ]; then
    docker compose --env-file "$ENV_FILE" "${COMPOSE_FILES[@]}" "$@"
  else
    docker compose "${COMPOSE_FILES[@]}" "$@"
  fi
}

# Lab-only: shift container host ports away when another local project already
# publishes the defaults (detected through docker's own view).
resolve_lab_ports() {
  docker_publishes() {
    docker ps --format '{{.Ports}}' 2>/dev/null | grep -qE ":$1->"
  }
  pick() {
    if docker_publishes "$1"; then
      log "host port $1 already published by another container — using $2" >&2
      echo "$2"
    else
      echo "$1"
    fi
  }
  export LAB_PG_PORT="${LAB_PG_PORT:-55432}"
  export LAB_REDIS_PORT="${LAB_REDIS_PORT:-56380}"
  export LAB_GATEWAY_PORT="${LAB_GATEWAY_PORT:-8010}" # 8000 is commonly taken by other local dev servers
}

# --- 1. docker -----------------------------------------------------------------
ensure_docker() {
  if ! command -v docker >/dev/null 2>&1; then
    [ "$INSTALL_DOCKER" = "1" ] || die "docker not found. Install it, or re-run with --install-docker (Ubuntu/Debian)."
    log "installing docker (apt)"
    apt-get update && apt-get install -y ca-certificates curl gnupg
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
      > /etc/apt/sources.list.d/docker.list
    apt-get update && apt-get install -y docker-ce docker-ce-cli containerd.io \
      docker-buildx-plugin docker-compose-plugin
  fi
  docker compose version >/dev/null 2>&1 || die "docker compose plugin missing (install docker-compose-plugin)"
}
ensure_docker

# --- 2. repo --------------------------------------------------------------------
if [ "$SKIP_PULL" = "0" ] && [ -d .git ]; then
  log "updating repository ($BRANCH)"
  git fetch origin "$BRANCH"
  git reset --hard "origin/$BRANCH"
fi

# --- 3. environment --------------------------------------------------------------
rand_hex() { openssl rand -hex 32 2>/dev/null || head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n'; }

if [[ "$TARGET" != "lab" ]]; then
  if [ ! -f "$ENV_FILE" ]; then
    log "creating $ENV_FILE with generated secrets"
    [ -n "${DOMAIN:-}" ] || die "first run: set DOMAIN, e.g.  sudo DOMAIN=$TARGET.example.com ./scripts/deploy.sh $TARGET"
    cat > "$ENV_FILE" <<EOF
STACK_ENV=$TARGET
DOMAIN=${DOMAIN}
PUBLIC_WS_URL=${PUBLIC_WS_URL:-ws://${DOMAIN}/ws}
TRUSTED_DOMAINS=https://${DOMAIN},http://${DOMAIN}
LOG_LEVEL=${LOG_LEVEL:-info}
RATE_GLOBAL_PER_MINUTE=${RATE_GLOBAL_PER_MINUTE:-300}
POSTGRES_PASSWORD=$(rand_hex)
ACCESS_TOKEN_SECRET=$(rand_hex)
INTERNAL_SECRET=$(rand_hex)
SESSION_CRYPTO_KEYS=$(rand_hex)
STREAM_SIGNING_KEYS=$(rand_hex)
STREAM_ENCRYPTION_KEYS=$(rand_hex)
REDIS_AUTH_PASSWORD=$(rand_hex)
REDIS_USERS_PASSWORD=$(rand_hex)
REDIS_RBAC_PASSWORD=$(rand_hex)
REDIS_WORKER_PASSWORD=$(rand_hex)
REDIS_REALTIME_PASSWORD=$(rand_hex)
REDIS_GATEWAY_PASSWORD=$(rand_hex)
REDIS_DLQ_ADMIN_PASSWORD=$(rand_hex)
SEED_ADMIN=${SEED_ADMIN:-true}
ADMIN_EMAIL=${ADMIN_EMAIL:-admin@example.com}
ADMIN_BOOTSTRAP_PASSWORD=$(rand_hex)
EOF
    chmod 600 "$ENV_FILE"
    echo "  -> secrets written to $ENV_FILE (chmod 600). Keep a copy of the admin password."
  elif [ ! -s "$ENV_FILE" ]; then
    die "$ENV_FILE exists but is empty"
  fi
  chmod 600 "$ENV_FILE" 2>/dev/null || true
fi

if [ "$WANT_DOWN" = "1" ]; then
  log "stopping stack"
  compose down
  exit 0
fi

# --- 4. build ---------------------------------------------------------------------
if [ "$SKIP_BUILD" = "0" ]; then
  log "building images (cache-aware)"
  compose build
else
  log "skipping image build (--skip-build)"
fi



if [ "$TARGET" = "lab" ]; then
  # --- lab rollout: fast path, everything exposed ---------------------------------
  resolve_lab_ports

  # Lab is disposable: start every deploy from a clean project state so stale
  # containers, half-finished runs and remembered profiles cannot interfere.
  # Named volumes survive this (no -v); wipe data explicitly with down -v.
  log "resetting lab project state (volumes kept)"
  compose down --remove-orphans >/dev/null 2>&1 || true

  # Never let remembered tool-profiles turn one-shot jobs into long-running
  # services during `up`.
  export COMPOSE_PROFILES=""

  # Images change rarely relative to code iterations: build only what is
  # missing unless --build forces a refresh. Frontend config is runtime
  # injected (infra/lab/web.config.js), so env changes never need a build.
  if [ "$SKIP_BUILD" = "0" ]; then
    MISSING=""
    for img in auth users rbac worker realtime gateway auth-seed rbac-seed web web-auth web-admin-users web-admin-roles; do
      docker image inspect "go-platform-lab-$img:latest" >/dev/null 2>&1 || MISSING="$MISSING $img"
    done
    if [ -n "$MISSING" ] || [ "${FORCE_BUILD:-0}" = "1" ]; then
      log "building images${MISSING:+ (missing:$MISSING)}"
      compose build
    else
      log "all images present — skipping build (use --build to force)"
    fi
  else
    log "skipping image build (--skip-build)"
  fi

  log "starting lab stack (all ports published)"
  compose up -d --remove-orphans

  compose run --rm -T rbac -seed >/dev/null && echo "  ok: rbac seed"
  # Deterministic lab credentials (documented): admin@example.local / local-root-access-2026!
  ADMIN_BOOTSTRAP_PASSWORD="${ADMIN_BOOTSTRAP_PASSWORD:-local-root-access-2026!}"     compose run --rm -T auth -seed >/dev/null && echo "  ok: auth seed"

  # /docs/openapi.json proves the REAL gateway owns :8000 (a stray process
  # serving index.html would pass a bare /healthz check).
  HEALTHY=0
  for _ in $(seq 1 60); do
    if curl -sf "http://127.0.0.1:${LAB_GATEWAY_PORT}/healthz" >/dev/null 2>&1 \
       && curl -sf "http://127.0.0.1:${LAB_GATEWAY_PORT}/docs/openapi.json" >/dev/null 2>&1 \
       && curl -sf "http://127.0.0.1:5173/" >/dev/null 2>&1; then HEALTHY=1; break; fi
    sleep 1
  done
  [ "$HEALTHY" = "1" ] || {
    echo "lab did not become healthy — recent logs:" >&2
    compose logs --tail=40 gateway auth web >&2
    die "health gate failed"
  }

  log "lab ready"
  cat <<'SUMMARY'

  Shell        http://127.0.0.1:5173
  Gateway      http://127.0.0.1:${LAB_GATEWAY_PORT}  (docs at /docs, health at /healthz)
  Services     auth :8081 · users :8082 · rbac :8083 · worker :8084 · realtime :8085
  Remotes      web-auth :5174 · web-admin-users :5175 · web-admin-roles :5176
  Admin login  admin@example.local / local-root-access-2026!

  logs     : docker compose -f infra/compose.base.yml -f infra/compose.lab.yml logs -f [svc]
  stop     : ./scripts/deploy-lab.sh down
SUMMARY
  exit 0
fi

# --- 5. migrations (uat/demo/prod) -----------------------------------------------
log "running migrations (before rollout)"
compose up -d postgres redis
until compose exec -T postgres pg_isready -U app >/dev/null 2>&1; do sleep 1; done

for svc in auth users rbac worker; do
  compose run --rm -T "$svc" -migrate >/dev/null
  echo "  ok: $svc migrate"
done

# --- 6. rollout -------------------------------------------------------------------
log "starting services behind the edge"
compose up -d --remove-orphans

# --- 7. seeds ----------------------------------------------------------------------
log "seeding (idempotent)"
compose run --rm -T rbac -seed >/dev/null
echo "  ok: rbac seed (role catalog + admin role)"

SEED_ADMIN_FROM_ENV="$(sed -n 's/^SEED_ADMIN=//p' "$ENV_FILE" | head -1)"
SEED_ADMIN="${SEED_ADMIN:-${SEED_ADMIN_FROM_ENV:-true}}"
if [ "$SEED_ADMIN" = "true" ]; then
  compose run --rm -T auth -seed >/dev/null
  echo "  ok: auth seed (bootstrap admin credentials in $ENV_FILE)"
fi

# --- 8. health gate -----------------------------------------------------------------
log "waiting for the edge to report healthy"
HEALTHY=0
for _ in $(seq 1 60); do
  if curl -sf "http://localhost:${EDGE_PORT:-80}/healthz" >/dev/null 2>&1; then HEALTHY=1; break; fi
  sleep 1
done
[ "$HEALTHY" = "1" ] || {
  echo "edge did not become healthy — recent logs:" >&2
  compose logs --tail=40 gateway edge >&2
  die "health gate failed"
}

DOMAIN_SET="$(grep -E '^DOMAIN=' "$ENV_FILE" | cut -d= -f2-)"
SCHEME="http"
grep -qE '^PUBLIC_WS_URL=wss://' "$ENV_FILE" && SCHEME="https"

log "[$TARGET] deploy complete"
cat <<SUMMARY

  URL          ${SCHEME}://${DOMAIN_SET:-<host-ip>}
  API docs     ${SCHEME}://${DOMAIN_SET:-<host-ip>}/docs
  Health       ${SCHEME}://${DOMAIN_SET:-<host-ip>}/healthz
  Admin login  $(grep -E '^ADMIN_EMAIL=' "$ENV_FILE" | cut -d= -f2-) /
                password in $ENV_FILE (ADMIN_BOOTSTRAP_PASSWORD)

  logs     : docker compose --env-file $ENV_FILE -f infra/compose.prod.yml logs -f [svc]
  rollback : git checkout <previous-tag-or-sha> && ./scripts/deploy.sh $TARGET --no-pull
SUMMARY
