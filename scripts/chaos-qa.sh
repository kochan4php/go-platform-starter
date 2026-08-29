#!/usr/bin/env bash
# Staging-only dependency drills. The target stack must be disposable and use
# docker compose project isolation; production is intentionally rejected.
set -euo pipefail

MODE="${1:-redis}"
BASE_URL="${BASE_URL:-http://127.0.0.1:8010}"
COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-starter-chaos}"
APP_ENV="${APP_ENV:-staging}"

if [ "$APP_ENV" != "staging" ] && [ "$APP_ENV" != "lab" ]; then
  echo "refusing chaos drill outside staging/lab" >&2
  exit 2
fi

probe() { curl -fsS "$BASE_URL/readyz" >/dev/null; }
probe

case "$MODE" in
  redis)
    docker compose -p "$COMPOSE_PROJECT_NAME" stop redis
    # Redis-backed rate limits intentionally fail open; the gateway stays alive.
    curl -sS -o /dev/null "$BASE_URL/healthz"
    docker compose -p "$COMPOSE_PROJECT_NAME" start redis
    ;;
  postgres)
    docker compose -p "$COMPOSE_PROJECT_NAME" restart postgres
    ;;
  *)
    echo "usage: $0 redis|postgres" >&2
    exit 2
    ;;
esac

for _ in $(seq 1 60); do
  if probe; then
    echo "PASS: $MODE dependency recovered"
    exit 0
  fi
  sleep 1
done
echo "FAIL: $MODE dependency did not recover within 60s" >&2
exit 1
