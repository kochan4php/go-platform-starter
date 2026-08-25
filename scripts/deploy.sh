#!/usr/bin/env bash
#
# Production auto-deploy for go-platform-starter (single VPS, docker compose).
#
#   sudo ./scripts/deploy.sh                 # first deploy & every update
#   sudo ./scripts/deploy.sh --no-pull       # skip git pull (local edits)
#   sudo ./scripts/deploy.sh --skip-build    # reuse existing images
#   sudo ./scripts/deploy.sh --down          # stop everything
#   ENV_FILE=/path/.env.production ./scripts/deploy.sh
#
# What it does:
#   1. verifies docker + compose plugin (offers install on apt systems)
#   2. fast-forwards the repo (git pull --ff-only)
#   3. creates infra/.env.production with random secrets on first run
#   4. builds all images
#   5. runs schema migrations (one-shot jobs, before rollout)
#   6. starts/replaces services behind the edge nginx
#   7. seeds role catalog + bootstrap admin (idempotent)
#   8. gates on the public health endpoint before declaring success
#
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ENV_FILE:-$REPO_DIR/infra/.env.production}"
BRANCH="${BRANCH:-main}"
SKIP_PULL=0 SKIP_BUILD=0 WANT_DOWN=0 INSTALL_DOCKER=0

for arg in "$@"; do
  case "$arg" in
    --no-pull) SKIP_PULL=1 ;;
    --skip-build) SKIP_BUILD=1 ;;
    --down) WANT_DOWN=1 ;;
    --install-docker) INSTALL_DOCKER=1 ;;
    *) echo "unknown flag: $arg" >&2; exit 1 ;;
  esac
done

log() { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }
die() { printf '\n\033[1;31mFATAL: %s\033[0m\n' "$*" >&2; exit 1; }

cd "$REPO_DIR"

# --- 1. docker ---------------------------------------------------------------
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

# --- 2. repo ------------------------------------------------------------------
if [ "$SKIP_PULL" = "0" ] && [ -d .git ]; then
  log "updating repository ($BRANCH)"
  git fetch origin "$BRANCH"
  git reset --hard "origin/$BRANCH"
fi

# --- 3. environment -----------------------------------------------------------
rand_hex() { openssl rand -hex 32 2>/dev/null || head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n'; }

if [ ! -f "$ENV_FILE" ]; then
  log "creating $ENV_FILE with generated secrets"
  [ -n "${DOMAIN:-}" ] || die "first run: set DOMAIN, e.g.  sudo DOMAIN=example.com ./scripts/deploy.sh"
  cat > "$ENV_FILE" <<EOF
DOMAIN=${DOMAIN}
PUBLIC_WS_URL=ws://${DOMAIN}/ws
TRUSTED_DOMAINS=https://${DOMAIN},http://${DOMAIN}
POSTGRES_PASSWORD=$(rand_hex)
ACCESS_TOKEN_SECRET=$(rand_hex)
INTERNAL_SECRET=$(rand_hex)
ADMIN_EMAIL=${ADMIN_EMAIL:-admin@example.com}
ADMIN_BOOTSTRAP_PASSWORD=$(rand_hex)
EOF
  chmod 600 "$ENV_FILE"
  echo "  -> secrets written to $ENV_FILE (chmod 600). Keep a copy of the admin password."
elif [ ! -s "$ENV_FILE" ]; then
  die "$ENV_FILE exists but is empty"
fi

CHMOD_GUARD() { chmod 600 "$ENV_FILE" 2>/dev/null || true; }
CHMOD_GUARD

compose() { docker compose --env-file "$ENV_FILE" -f "$REPO_DIR/infra/compose.prod.yml" "$@"; }

if [ "$WANT_DOWN" = "1" ]; then
  log "stopping stack"
  compose down
  exit 0
fi

# --- 4. build -----------------------------------------------------------------
if [ "$SKIP_BUILD" = "0" ]; then
  log "building images (cache-aware)"
  compose build
else
  log "skipping image build (--skip-build)"
fi

# --- 5. migrations ------------------------------------------------------------
log "running migrations (before rollout)"
compose up -d postgres redis
until compose exec -T postgres pg_isready -U app >/dev/null 2>&1; do sleep 1; done
for job in auth-migrate users-migrate rbac-migrate worker-migrate; do
  compose --profile tools run --rm "$job" >/dev/null
  echo "  ok: $job"
done

# --- 6. rollout -----------------------------------------------------------------
log "starting services"
compose up -d --remove-orphans

# --- 7. seeds -------------------------------------------------------------------
log "seeding (idempotent)"
compose --profile tools run --rm rbac-seed >/dev/null
echo "  ok: rbac-seed (role catalog + admin role)"
SEED_ADMIN="${SEED_ADMIN:-true}"
if [ "$SEED_ADMIN" = "true" ]; then
  compose --profile tools run --rm auth-seed | sed -n 's/.*BOOTSTRAP ADMIN PASSWORD.*/&/p;/admin@example/p;/^$/d' || true
  echo "  ok: auth-seed (bootstrap admin credentials printed above on first run only)"
fi

# --- 8. health gate -------------------------------------------------------------
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
if grep -qE '^PUBLIC_WS_URL=wss://' "$ENV_FILE"; then SCHEME="https"; else SCHEME="http"; fi
log "deploy complete"
cat <<SUMMARY

  URL          ${SCHEME}://${DOMAIN_SET:-<host-ip>}
  API docs     ${SCHEME}://${DOMAIN_SET:-<host-ip>}/docs
  Health       ${SCHEME}://${DOMAIN_SET:-<host-ip>}/healthz
  Admin login  $(grep -E '^ADMIN_EMAIL=' "$ENV_FILE" | cut -d= -f2-) /
               password in $ENV_FILE (ADMIN_BOOTSTRAP_PASSWORD)

  logs     : compose --env-file $ENV_FILE -f infra/compose.prod.yml logs -f [svc]
  rollback : git checkout <previous-tag-or-sha> && ./scripts/deploy.sh --no-pull
SUMMARY
