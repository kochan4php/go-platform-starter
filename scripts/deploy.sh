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
#   --no-pull         Skip the safe git fast-forward step (local edits)
#   --skip-build      Reuse existing images, do not rebuild
#   --build           Force a LAB image rebuild
#   --check           Validate target env + Compose, then exit
#   --down            Stop and remove the target stack
#   --install-docker  Install Docker + compose plugin on apt systems first
#
# Environment variables: DOMAIN, EDGE_PORT, AGE_BACKUP_RECIPIENT,
# ADMIN_EMAIL, SEED_ADMIN, BRANCH, ENV_FILE.
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
SKIP_PULL=0 SKIP_BUILD=0 FORCE_BUILD=0 CHECK_ONLY=0 WANT_DOWN=0 INSTALL_DOCKER=0
BUILD_SERVICES=(auth users rbac worker realtime scheduler gateway web web-auth web-admin-users web-admin-roles)

TARGET=""
for arg in "$@"; do
  case "$arg" in
    lab|uat|demo|prod) TARGET="$arg" ;;
    --no-pull) SKIP_PULL=1 ;;
    --skip-build) SKIP_BUILD=1 ;;
    --build) FORCE_BUILD=1 ;;
    --check) CHECK_ONLY=1 ;;
    --down) WANT_DOWN=1 ;;
    --install-docker) INSTALL_DOCKER=1 ;;
    *) echo "unknown argument: $arg" >&2; exit 1 ;;
  esac
done
[ -n "$TARGET" ] || { sed -n '3,20p' "${BASH_SOURCE[0]}"; exit 1; }
[ "$WANT_DOWN" = "0" ] && [ "$CHECK_ONLY" = "0" ] || SKIP_PULL=1

log() { printf '\n\033[1;36m==> [%s] %s\033[0m\n' "$TARGET" "$*"; }
die() { printf '\n\033[1;31mFATAL: %s\033[0m\n' "$*" >&2; exit 1; }

wait_url() {
  local url="$1"
  for _ in $(seq 1 60); do
    curl -sf "$url" >/dev/null 2>&1 && return 0
    sleep 1
  done
  return 1
}

cd "$REPO_DIR"

# --- per-target wiring ---------------------------------------------------------
if [ -z "${ENV_FILE:-}" ]; then
  if [ "$TARGET" = "prod" ]; then
    ENV_FILE="$REPO_DIR/infra/.env.production"
    if [ ! -f "$ENV_FILE" ] && [ -f "$REPO_DIR/infra/.env.prod" ]; then
      ENV_FILE="$REPO_DIR/infra/.env.prod"
      log "using legacy $ENV_FILE; rename it to infra/.env.production after deploy"
    fi
  else
    ENV_FILE="$REPO_DIR/infra/.env.$TARGET"
  fi
fi

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

# Compose delegates multi-service builds to Bake on recent versions, which can
# exhaust Docker Desktop or a small VPS by compiling every image at once.
build_images() {
  local service
  for service in "$@"; do
    log "building image: $service"
    compose build "$service"
  done
}

# Lab-only: shift every published port away from Docker containers or host
# processes that already own the defaults.
resolve_lab_ports() {
  docker_publishes() {
    docker ps --format '{{.Ports}}' 2>/dev/null | grep -qE ":$1->"
  }
  host_listens() {
    local port="$1"
    docker_publishes "$port" && return 0
    if command -v ss >/dev/null 2>&1; then
      ss -lnt 2>/dev/null | grep -qE "[.:]${port}[[:space:]]"
    elif command -v netstat >/dev/null 2>&1; then
      netstat -an 2>/dev/null | grep -qEi "[.:]${port}[[:space:]].*LISTEN"
    else
      return 1
    fi
  }
  pick_lab_port() {
    local name="$1" preferred="$2" candidate="$2"
    case "$preferred" in *[!0-9]*|"") die "$name must be a numeric TCP port" ;; esac
    while host_listens "$candidate" || [[ " $LAB_TAKEN_PORTS " == *" $candidate "* ]]; do
      candidate=$((candidate + 1))
    done
    [ "$candidate" = "$preferred" ] || log "host port $preferred is busy; using $candidate"
    printf -v "$name" '%s' "$candidate"
    export "${name?}"
    LAB_TAKEN_PORTS="$LAB_TAKEN_PORTS $candidate"
  }

  local LAB_TAKEN_PORTS=""
  pick_lab_port LAB_PG_PORT "${LAB_PG_PORT:-55432}"
  pick_lab_port LAB_REDIS_PORT "${LAB_REDIS_PORT:-56380}"
  pick_lab_port LAB_AUTH_PORT "${LAB_AUTH_PORT:-8081}"
  pick_lab_port LAB_USERS_PORT "${LAB_USERS_PORT:-8082}"
  pick_lab_port LAB_RBAC_PORT "${LAB_RBAC_PORT:-8083}"
  pick_lab_port LAB_WORKER_PORT "${LAB_WORKER_PORT:-8084}"
  pick_lab_port LAB_REALTIME_PORT "${LAB_REALTIME_PORT:-8085}"
  pick_lab_port LAB_SCHEDULER_PORT "${LAB_SCHEDULER_PORT:-8086}"
  pick_lab_port LAB_GATEWAY_PORT "${LAB_GATEWAY_PORT:-8010}"
  pick_lab_port LAB_WEB_PORT "${LAB_WEB_PORT:-5173}"
  pick_lab_port LAB_WEB_AUTH_PORT "${LAB_WEB_AUTH_PORT:-5174}"
  pick_lab_port LAB_WEB_ADMIN_USERS_PORT "${LAB_WEB_ADMIN_USERS_PORT:-5175}"
  pick_lab_port LAB_WEB_ADMIN_ROLES_PORT "${LAB_WEB_ADMIN_ROLES_PORT:-5176}"
}

# --- 1. docker -----------------------------------------------------------------
ensure_docker() {
  if ! command -v docker >/dev/null 2>&1; then
    [ "$INSTALL_DOCKER" = "1" ] || die "docker not found. Install it, or re-run with --install-docker (Ubuntu/Debian)."
    log "installing docker (apt)"
    apt-get update && apt-get install -y ca-certificates curl gnupg
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
    # Sourced only on Docker-supported Linux hosts.
    # shellcheck disable=SC1091
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
  [ "$(git branch --show-current)" = "$BRANCH" ] || die "current branch must be $BRANCH (or use --no-pull)"
  git fetch origin "$BRANCH"
  git merge --ff-only "origin/$BRANCH"
fi

export GIT_COMMIT="${GIT_COMMIT:-$(git rev-parse --short HEAD 2>/dev/null || echo unknown)}"
export APP_VERSION="${APP_VERSION:-$GIT_COMMIT}"
export BUILD_DATE="${BUILD_DATE:-$(date -u +%Y-%m-%dT%H:%M:%SZ)}"

# --- 3. environment --------------------------------------------------------------
rand_hex() { openssl rand -hex 32 2>/dev/null || head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n'; }

if [[ "$TARGET" != "lab" ]]; then
  if [ "$WANT_DOWN" = "1" ] && [ ! -f "$ENV_FILE" ]; then
    log "no environment file at $ENV_FILE; nothing to stop"
    exit 0
  fi
  if [ ! -f "$ENV_FILE" ]; then
    [ "$CHECK_ONLY" = "0" ] || die "$ENV_FILE not found"
    log "creating $ENV_FILE with generated secrets"
    [ -n "${DOMAIN:-}" ] || die "first run: set DOMAIN, e.g.  sudo DOMAIN=$TARGET.example.com ./scripts/deploy.sh $TARGET"
    if [ "$TARGET" = "prod" ] && [ -z "${AGE_BACKUP_RECIPIENT:-}" ]; then
      die "first production run: set AGE_BACKUP_RECIPIENT to the offline age public key"
    fi
    REDIS_OBSERVER_GENERATED="$(rand_hex)"
    PUBLIC_WS_URL_VALUE="${PUBLIC_WS_URL:-ws://${DOMAIN}/ws}"
    case "$PUBLIC_WS_URL_VALUE" in wss://*) PUBLIC_SCHEME=https ;; *) PUBLIC_SCHEME=http ;; esac
    APP_PUBLIC_URL_VALUE="${APP_PUBLIC_URL:-${PUBLIC_SCHEME}://${DOMAIN}}"
    SEED_ADMIN_DEFAULT=true
    [ "$TARGET" = "prod" ] && SEED_ADMIN_DEFAULT=false
    cat > "$ENV_FILE" <<EOF
STACK_ENV=$TARGET
DOMAIN=${DOMAIN}
EDGE_PORT=${EDGE_PORT:-80}
APP_PUBLIC_URL=$APP_PUBLIC_URL_VALUE
PUBLIC_WS_URL=$PUBLIC_WS_URL_VALUE
TRUSTED_DOMAINS=${TRUSTED_DOMAINS:-$APP_PUBLIC_URL_VALUE}
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
REDIS_SCHEDULER_PASSWORD=$(rand_hex)
REDIS_REALTIME_PASSWORD=$(rand_hex)
REDIS_GATEWAY_PASSWORD=$(rand_hex)
REDIS_DLQ_ADMIN_PASSWORD=$(rand_hex)
REDIS_BACKUP_PASSWORD=$(rand_hex)
AGE_BACKUP_RECIPIENT=${AGE_BACKUP_RECIPIENT:-}
REDIS_OBSERVER_PASSWORD=$REDIS_OBSERVER_GENERATED
DEBUG_REQUEST_TOKEN=$(rand_hex)
GRAFANA_ADMIN_PASSWORD=$(rand_hex)
REDIS_EXPORTER_USER=observer
REDIS_EXPORTER_PASSWORD=$REDIS_OBSERVER_GENERATED
SEED_ADMIN=${SEED_ADMIN:-$SEED_ADMIN_DEFAULT}
ADMIN_EMAIL=${ADMIN_EMAIL:-admin@example.com}
ADMIN_BOOTSTRAP_PASSWORD=Aa1!$(rand_hex)
EOF
    chmod 600 "$ENV_FILE"
    echo "  -> secrets written to $ENV_FILE (chmod 600). Keep a copy of the admin password."
  elif [ ! -s "$ENV_FILE" ]; then
    die "$ENV_FILE exists but is empty"
  fi
  if [ "$CHECK_ONLY" = "0" ]; then
    if ! grep -q '^REDIS_OBSERVER_PASSWORD=' "$ENV_FILE"; then
      REDIS_OBSERVER_GENERATED="$(rand_hex)"
      printf 'REDIS_OBSERVER_PASSWORD=%s\nREDIS_EXPORTER_USER=observer\nREDIS_EXPORTER_PASSWORD=%s\n' "$REDIS_OBSERVER_GENERATED" "$REDIS_OBSERVER_GENERATED" >> "$ENV_FILE"
    fi
    grep -q '^DEBUG_REQUEST_TOKEN=' "$ENV_FILE" || printf 'DEBUG_REQUEST_TOKEN=%s\n' "$(rand_hex)" >> "$ENV_FILE"
    grep -q '^GRAFANA_ADMIN_PASSWORD=' "$ENV_FILE" || printf 'GRAFANA_ADMIN_PASSWORD=%s\n' "$(rand_hex)" >> "$ENV_FILE"
    grep -q '^REDIS_SCHEDULER_PASSWORD=' "$ENV_FILE" || printf 'REDIS_SCHEDULER_PASSWORD=%s\n' "$(rand_hex)" >> "$ENV_FILE"
    grep -q '^EDGE_PORT=' "$ENV_FILE" || printf 'EDGE_PORT=80\n' >> "$ENV_FILE"
    if ! grep -q '^APP_PUBLIC_URL=' "$ENV_FILE"; then
      DOMAIN_FROM_ENV="$(sed -n 's/^DOMAIN=//p' "$ENV_FILE" | head -1)"
      PUBLIC_WS_FROM_ENV="$(sed -n 's/^PUBLIC_WS_URL=//p' "$ENV_FILE" | head -1)"
      case "$PUBLIC_WS_FROM_ENV" in wss://*) PUBLIC_SCHEME=https ;; *) PUBLIC_SCHEME=http ;; esac
      printf 'APP_PUBLIC_URL=%s://%s\n' "$PUBLIC_SCHEME" "$DOMAIN_FROM_ENV" >> "$ENV_FILE"
    fi
    grep -q '^AGE_BACKUP_RECIPIENT=' "$ENV_FILE" || printf 'AGE_BACKUP_RECIPIENT=%s\n' "${AGE_BACKUP_RECIPIENT:-}" >> "$ENV_FILE"
    chmod 600 "$ENV_FILE" 2>/dev/null || true
  fi

  STACK_ENV_FROM_FILE="$(sed -n 's/^STACK_ENV=//p' "$ENV_FILE" | head -1)"
  [ "$STACK_ENV_FROM_FILE" = "$TARGET" ] || die "$ENV_FILE must contain STACK_ENV=$TARGET (found ${STACK_ENV_FROM_FILE:-empty})"
  BACKUP_RECIPIENT="$(sed -n 's/^AGE_BACKUP_RECIPIENT=//p' "$ENV_FILE" | head -1)"
  case "$BACKUP_RECIPIENT" in
    ""|*change-me*|*replace*) [ "$TARGET" != "prod" ] || die "$ENV_FILE must contain a real AGE_BACKUP_RECIPIENT" ;;
    *)
      case ",${COMPOSE_PROFILES:-}," in
        *,backup,*) ;;
        *) export COMPOSE_PROFILES="${COMPOSE_PROFILES:+$COMPOSE_PROFILES,}backup" ;;
      esac
      ;;
  esac
fi

compose config --quiet || die "Compose configuration is invalid for $TARGET"

if [ "$CHECK_ONLY" = "1" ]; then
  log "configuration valid"
  exit 0
fi

if [ "$WANT_DOWN" = "1" ]; then
  log "stopping stack"
  compose down --remove-orphans
  exit 0
fi

if [ "$TARGET" = "lab" ]; then
  # --- lab rollout: fast path, everything exposed ---------------------------------
  # Lab is disposable: start every deploy from a clean project state so stale
  # containers, half-finished runs and remembered profiles cannot interfere.
  # Named volumes survive this (no -v); wipe data explicitly with down -v.
  log "resetting lab project state (volumes kept)"
  compose down --remove-orphans >/dev/null 2>&1 || true
  resolve_lab_ports

  # Never let remembered tool-profiles turn one-shot jobs into long-running
  # services during `up`.
  export COMPOSE_PROFILES=""

  # Images change rarely relative to code iterations: build only what is
  # missing unless --build forces a refresh. Frontend config is runtime
  # injected (infra/lab/web.config.js), so env changes never need a build.
  if [ "$SKIP_BUILD" = "0" ]; then
    MISSING=""
    for img in auth users rbac worker realtime scheduler gateway web web-auth web-admin-users web-admin-roles; do
      docker image inspect "go-platform-lab-$img:latest" >/dev/null 2>&1 || MISSING="$MISSING $img"
    done
    if [ "$FORCE_BUILD" = "1" ]; then
      log "force-building all images"
      build_images "${BUILD_SERVICES[@]}"
    elif [ -n "$MISSING" ]; then
      log "building missing images:$MISSING"
      # Intentional word splitting: MISSING is assembled from fixed service names.
      # shellcheck disable=SC2086
      build_images $MISSING
    else
      log "all images present — skipping build (use --build to force)"
    fi
  else
    log "skipping image build (--skip-build)"
  fi

  log "starting lab stack (all ports published)"
  if ! compose up -d --remove-orphans --wait --wait-timeout 180; then
    compose logs --tail=40 gateway auth users rbac worker realtime scheduler web >&2
    die "lab services failed to become healthy"
  fi

  compose run --rm -T rbac -seed >/dev/null && echo "  ok: rbac seed"
  # Deterministic lab credentials (documented): admin@example.local / local-root-access-2026!
  ADMIN_BOOTSTRAP_PASSWORD="${ADMIN_BOOTSTRAP_PASSWORD:-local-root-access-2026!}" \
    compose run --rm -T auth -seed >/dev/null && echo "  ok: auth seed"

  # /docs/openapi.json proves the REAL gateway owns :8000 (a stray process
  # serving index.html would pass a bare /healthz check).
  for url in \
    "http://127.0.0.1:${LAB_GATEWAY_PORT}/healthz" \
    "http://127.0.0.1:${LAB_GATEWAY_PORT}/readyz" \
    "http://127.0.0.1:${LAB_GATEWAY_PORT}/docs/openapi.json" \
    "http://127.0.0.1:${LAB_WEB_PORT}/" \
    "http://127.0.0.1:${LAB_WEB_AUTH_PORT}/assets/remoteEntry.js" \
    "http://127.0.0.1:${LAB_WEB_ADMIN_USERS_PORT}/assets/remoteEntry.js" \
    "http://127.0.0.1:${LAB_WEB_ADMIN_ROLES_PORT}/assets/remoteEntry.js"; do
    wait_url "$url" || { compose logs --tail=40 gateway web web-auth web-admin-users web-admin-roles >&2; die "health gate failed: $url"; }
  done

  log "lab ready"
  cat <<SUMMARY

  Shell        http://127.0.0.1:${LAB_WEB_PORT}
  Gateway      http://127.0.0.1:${LAB_GATEWAY_PORT}  (docs at /docs, health at /healthz)
  Services     auth :${LAB_AUTH_PORT} · users :${LAB_USERS_PORT} · rbac :${LAB_RBAC_PORT} · worker :${LAB_WORKER_PORT} · realtime :${LAB_REALTIME_PORT} · scheduler :${LAB_SCHEDULER_PORT}
  Remotes      web-auth :${LAB_WEB_AUTH_PORT} · web-admin-users :${LAB_WEB_ADMIN_USERS_PORT} · web-admin-roles :${LAB_WEB_ADMIN_ROLES_PORT}
  Admin login  admin@example.local / local-root-access-2026!

  logs     : docker compose -f infra/compose.base.yml -f infra/compose.lab.yml logs -f [svc]
  stop     : ./scripts/deploy-lab.sh --down
SUMMARY
  exit 0
fi

# --- 4. build (uat/demo/prod) -----------------------------------------------------
if [ "$SKIP_BUILD" = "0" ]; then
  log "building images (cache-aware)"
  build_images "${BUILD_SERVICES[@]}"
else
  log "skipping image build (--skip-build)"
fi

# --- 5. migrations (uat/demo/prod) -----------------------------------------------
log "running migrations (before rollout)"
if ! compose up -d postgres redis --wait --wait-timeout 120; then
  compose logs --tail=40 postgres redis >&2
  die "database dependencies failed to become healthy"
fi

for svc in auth users rbac worker; do
  compose run --rm -T "$svc" -migrate >/dev/null
  echo "  ok: $svc migrate"
done

# --- 6. rollout -------------------------------------------------------------------
log "starting services behind the edge"
if ! compose up -d --remove-orphans --wait --wait-timeout 180; then
  compose logs --tail=40 gateway edge auth users rbac worker realtime scheduler >&2
  die "services failed to become healthy"
fi

# --- 7. seeds ----------------------------------------------------------------------
log "seeding (idempotent)"
compose run --rm -T rbac -seed >/dev/null
echo "  ok: rbac seed (role catalog + admin role)"

SEED_ADMIN_FROM_ENV="$(sed -n 's/^SEED_ADMIN=//p' "$ENV_FILE" | head -1)"
SEED_ADMIN="${SEED_ADMIN:-${SEED_ADMIN_FROM_ENV:-true}}"
if [ "$SEED_ADMIN" = "true" ]; then
  compose run --rm -T auth -seed || die "auth seed failed; verify ADMIN_BOOTSTRAP_PASSWORD satisfies the password policy"
  echo "  ok: auth seed (bootstrap admin credentials in $ENV_FILE)"
fi

# --- 8. health gate -----------------------------------------------------------------
log "running edge smoke checks"
EDGE_PORT_FROM_ENV="$(sed -n 's/^EDGE_PORT=//p' "$ENV_FILE" | head -1)"
if ! "$REPO_DIR/scripts/smoke-deploy.sh" "http://127.0.0.1:${EDGE_PORT_FROM_ENV:-80}"; then
  echo "edge did not become healthy — recent logs:" >&2
  compose logs --tail=40 gateway edge >&2
  die "health gate failed"
fi

if [ -n "${GRAFANA_URL:-}" ] && [ -n "${GRAFANA_TOKEN:-}" ]; then
  GIT_COMMIT="$(git rev-parse --short HEAD 2>/dev/null || echo unknown)" \
    "$REPO_DIR/scripts/annotate-deploy.sh" "$TARGET" || echo "  warning: Grafana deploy annotation failed" >&2
fi

PUBLIC_URL="$(sed -n 's/^APP_PUBLIC_URL=//p' "$ENV_FILE" | head -1)"
PUBLIC_URL="${PUBLIC_URL%/}"

log "deploy complete"
cat <<SUMMARY

  URL          ${PUBLIC_URL}
  API docs     ${PUBLIC_URL}/docs
  Health       ${PUBLIC_URL}/healthz
  Admin login  $(grep -E '^ADMIN_EMAIL=' "$ENV_FILE" | cut -d= -f2-) /
                password in $ENV_FILE (ADMIN_BOOTSTRAP_PASSWORD)

  logs     : docker compose --env-file $ENV_FILE -f infra/compose.prod.yml logs -f [svc]
  rollback : git checkout <previous-tag-or-sha> && ./scripts/deploy.sh $TARGET --no-pull
SUMMARY
