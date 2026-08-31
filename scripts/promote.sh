#!/usr/bin/env bash
# Promotion controller: freeze -> backup -> deploy -> smoke -> rollback/audit.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET="${1:-}"
REVISION="${2:-origin/main}"
DRY_RUN=0
[ "${3:-}" = "--dry-run" ] && DRY_RUN=1
case "$TARGET" in uat|demo|prod) ;; *) echo "usage: promote.sh uat|demo|prod REVISION [--dry-run]" >&2; exit 2 ;; esac

cd "$ROOT"
node scripts/check-change-freeze.mjs "$TARGET"
PREVIOUS="$(git rev-parse HEAD)"
if [ -z "${ENV_FILE:-}" ]; then
  if [ "$TARGET" = "prod" ]; then
    ENV_FILE="$ROOT/infra/.env.production"
    [ -f "$ENV_FILE" ] || [ ! -f "$ROOT/infra/.env.prod" ] || ENV_FILE="$ROOT/infra/.env.prod"
  else
    ENV_FILE="$ROOT/infra/.env.$TARGET"
  fi
fi
BACKUP_DIR="${BACKUP_DIR:-$ROOT/backups/$TARGET}"

git fetch origin --tags
RESOLVED="$(git rev-parse "$REVISION^{commit}")"

if [ "$DRY_RUN" = "1" ]; then
  ENV_FILE="$ENV_FILE" ./scripts/deploy.sh "$TARGET" --no-pull --check
  printf 'dry-run: %s %s -> %s; backup=%s; smoke+rollback enabled\n' "$TARGET" "$PREVIOUS" "$RESOLVED" "$BACKUP_DIR"
  exit 0
fi

mkdir -p "$BACKUP_DIR"
if [ -f "$ENV_FILE" ] && docker compose --env-file "$ENV_FILE" -f infra/compose.prod.yml ps --status running postgres --quiet | grep -q .; then
  STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
  TEMP="$BACKUP_DIR/postgres-$STAMP.dump.tmp"
  docker compose --env-file "$ENV_FILE" -f infra/compose.prod.yml exec -T postgres \
    pg_dump --format=custom --no-owner --no-acl -U app app > "$TEMP"
  test -s "$TEMP"
  mv "$TEMP" "$BACKUP_DIR/postgres-$STAMP.dump"
fi

notify() { node scripts/deploy-notify.mjs "$1" "$TARGET" "$2" || true; }
audit() { node scripts/deploy-audit.mjs "$1" "$TARGET" "$2" "$PREVIOUS"; }
rollback() {
  trap - ERR
  audit failed "$RESOLVED"
  notify failed "$RESOLVED"
  audit rolling_back "$PREVIOUS"
  notify rolling_back "$PREVIOUS"
  git reset --hard "$PREVIOUS"
  ENV_FILE="$ENV_FILE" ./scripts/deploy.sh "$TARGET" --no-pull
}
trap rollback ERR

git reset --hard "$RESOLVED"
ENV_FILE="$ENV_FILE" ./scripts/deploy.sh "$TARGET" --no-pull
DOMAIN="$(sed -n 's/^DOMAIN=//p' "$ENV_FILE" | head -1)"
SCHEME=http
grep -q '^PUBLIC_WS_URL=wss://' "$ENV_FILE" && SCHEME=https
EDGE_PORT="$(sed -n 's/^EDGE_PORT=//p' "$ENV_FILE" | head -1)"
PORT_SUFFIX=""
[ "$SCHEME" != "http" ] || [ "${EDGE_PORT:-80}" = "80" ] || PORT_SUFFIX=":$EDGE_PORT"
./scripts/smoke-deploy.sh "$SCHEME://$DOMAIN$PORT_SUFFIX"
trap - ERR
audit succeeded "$RESOLVED"
notify succeeded "$RESOLVED"
