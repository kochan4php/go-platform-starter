#!/usr/bin/env bash
# Resilience drill (PLAN item 84): kill auth under steady load and prove the
# gateway degrades with the standard failure envelope, then recovers.
set -euo pipefail
cd "$(dirname "$0")/.."

# Dynamic ports so concurrent/aborted runs never collide with leftovers.
BASE_PORT=$((18000 + ($$ % 500) * 2))
GW_PORT=$((BASE_PORT))
AUTH_PORT=$((BASE_PORT + 1))

export E2E_ADMIN_PASSWORD="${E2E_ADMIN_PASSWORD:-e2e-root-access-2026!}"
PG_UP=0
cleanup() {
  [ "$PG_UP" = "1" ] && docker rm -f drill-pg drill-redis >/dev/null 2>&1 || true
  [ -n "${AUTH_PID:-}" ] && kill "$AUTH_PID" 2>/dev/null || true
  [ -n "${GW_PID:-}" ] && kill "$GW_PID" 2>/dev/null || true
  [ -n "${LOAD_PID:-}" ] && kill "$LOAD_PID" 2>/dev/null || true
}
trap cleanup EXIT

echo "== booting isolated drill infra =="
docker rm -f drill-pg drill-redis >/dev/null 2>&1 || true
docker run -d --name drill-pg -e POSTGRES_USER=app -e POSTGRES_PASSWORD=app \
  -e POSTGRES_DB=app -p 55433:5432 postgres:17-alpine >/dev/null
docker run -d --name drill-redis -p 55434:6379 redis:7-alpine >/dev/null
PG_UP=1
until docker exec drill-pg pg_isready -U app >/dev/null 2>&1; do sleep 1; done

mkdir -p tmp/drill
for svc in auth gateway; do go build -o "tmp/drill/${svc}" "./services/${svc}"; done
go build -o tmp/drill/perf-smoke ./scripts/perf-smoke

export DRILL_DSN="postgres://app:app@127.0.0.1:55433/app?sslmode=disable"
export DRILL_REDIS="127.0.0.1:55434"
DATABASE_URL="$DRILL_DSN" REDIS_ADDR="$DRILL_REDIS" \
  ACCESS_TOKEN_SECRET="drill-secret-change-me-16+" INTERNAL_SECRET="drill-internal" \
  ./tmp/drill/auth -migrate >/dev/null 2>&1
DATABASE_URL="$DRILL_DSN" REDIS_ADDR="$DRILL_REDIS" \
  ACCESS_TOKEN_SECRET="drill-secret-change-me-16+" INTERNAL_SECRET="drill-internal" \
  ADMIN_BOOTSTRAP_PASSWORD="$E2E_ADMIN_PASSWORD" ./tmp/drill/auth -seed >/dev/null 2>&1

start_auth() {
  DATABASE_URL="$DRILL_DSN" REDIS_ADDR="$DRILL_REDIS" \
    ACCESS_TOKEN_SECRET="drill-secret-change-me-16+" INTERNAL_SECRET="drill-internal" \
    APP_PUBLIC_URL="http://127.0.0.1:5173" PORT="$AUTH_PORT" ./tmp/drill/auth >>tmp/drill/auth.log 2>&1 &
  AUTH_PID=$!
}
start_auth
DATABASE_URL="$DRILL_DSN" REDIS_ADDR="$DRILL_REDIS" \
  ACCESS_TOKEN_SECRET="drill-secret-change-me-16+" INTERNAL_SECRET="drill-internal" \
  PORT="$GW_PORT" UPSTREAMS="{\"auth\":\"http://127.0.0.1:${AUTH_PORT}\"}" \
  ./tmp/drill/gateway >tmp/drill/gw.log 2>&1 &
GW_PID=$!

for port in "$AUTH_PORT" "$GW_PORT"; do
  ok=0
  for i in $(seq 1 40); do
    if curl -sf "http://127.0.0.1:${port}/healthz" >/dev/null; then ok=1; break; fi
    sleep 0.5
  done
  [ "$ok" = "1" ] || { echo "FAIL: service :${port} never healthy"; exit 1; }
done

TOKEN=$(curl -sf -X POST http://127.0.0.1:${GW_PORT}/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.local","password":"'"$E2E_ADMIN_PASSWORD"'"}' \
  | sed -n 's/.*"accessToken":"\([^"]*\)".*/\1/p')
[ -n "$TOKEN" ] || { echo "FAIL: login failed"; exit 1; }

echo "== steady authenticated load through gateway =="
./tmp/drill/perf-smoke -url http://127.0.0.1:${GW_PORT}/api/v1/auth/sessions \
  -token "$TOKEN" -n 2000 -c 5 > tmp/drill/load-before.log 2>&1 &
LOAD_PID=$!
sleep 2

echo "== killing auth mid-load =="
kill -9 "$AUTH_PID" 2>/dev/null || true
sleep 1
DEGRADED_CODE=$(curl -s -o tmp/drill/degraded-body.json -w "%{http_code}" \
  http://127.0.0.1:${GW_PORT}/api/v1/auth/sessions -H "Authorization: Bearer $TOKEN" || echo "curl-failed")
kill "$LOAD_PID" 2>/dev/null || true
echo "degraded response code: $DEGRADED_CODE"
grep -q '"success":false' tmp/drill/degraded-body.json \
  && echo "PASS degraded envelope shape {success:false,...}" \
  || { echo "NOTE degraded body:"; cat tmp/drill/degraded-body.json; }

echo "== restarting auth =="
start_auth
ok=0
for i in $(seq 1 60); do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    http://127.0.0.1:${GW_PORT}/api/v1/auth/sessions -H "Authorization: Bearer $TOKEN" || true)
  if [ "$CODE" = "200" ]; then ok=1; break; fi
  sleep 0.5
done
[ "$ok" = "1" ] && echo "PASS recovered: sessions probe -> 200 after restart" \
  || { echo "FAIL: did not recover"; exit 1; }
echo "DRILL COMPLETE"
