#!/usr/bin/env bash
set -euo pipefail

: "${IMAGE:?set IMAGE to an immutable image digest, e.g. ghcr.io/org/gateway@sha256:...}"
: "${ENV_FILE:?set ENV_FILE to the container environment file}"
ACTIVE_FILE="${ACTIVE_FILE:-/var/lib/go-platform/active-color}"
NGINX_UPSTREAM="${NGINX_UPSTREAM:-/etc/nginx/conf.d/go-platform-upstream.conf}"
HEALTH_PATH="${HEALTH_PATH:-/healthz}"
NETWORK="${DOCKER_NETWORK:-go-platform-prod_default}"

[ -f "$ENV_FILE" ] || { echo "missing ENV_FILE: $ENV_FILE" >&2; exit 1; }
[ "${IMAGE#*@sha256:}" != "$IMAGE" ] || { echo "IMAGE must be pinned by sha256 digest" >&2; exit 1; }
active="$(cat "$ACTIVE_FILE" 2>/dev/null || printf blue)"
case "$active" in blue) next=green; port=18081 ;; green) next=blue; port=18080 ;; *) echo "invalid active color" >&2; exit 1 ;; esac
container="go-platform-gateway-$next"

docker rm -f "$container" >/dev/null 2>&1 || true
docker run -d --name "$container" --restart unless-stopped --network "$NETWORK" \
  --env-file "$ENV_FILE" -e PORT=8000 -p "127.0.0.1:$port:8000" "$IMAGE" >/dev/null

healthy=0
for _ in $(seq 1 60); do
  if curl -fsS "http://127.0.0.1:$port$HEALTH_PATH" >/dev/null; then healthy=1; break; fi
  sleep 1
done
if [ "$healthy" != 1 ]; then
  docker logs --tail 50 "$container" >&2 || true
  docker rm -f "$container" >/dev/null 2>&1 || true
  echo "candidate failed health gate; active color unchanged" >&2
  exit 1
fi

tmp="$(mktemp "${NGINX_UPSTREAM}.XXXXXX")"
printf 'upstream go_platform_gateway { server 127.0.0.1:%s max_fails=2 fail_timeout=10s; }\n' "$port" > "$tmp"
previous="${NGINX_UPSTREAM}.previous"
[ ! -f "$NGINX_UPSTREAM" ] || cp "$NGINX_UPSTREAM" "$previous"
mv "$tmp" "$NGINX_UPSTREAM"
if ! nginx -t; then
  [ ! -f "$previous" ] || mv "$previous" "$NGINX_UPSTREAM"
  docker rm -f "$container" >/dev/null 2>&1 || true
  echo "candidate nginx configuration rejected; active color unchanged" >&2
  exit 1
fi
if ! nginx -s reload; then
  [ ! -f "$previous" ] || mv "$previous" "$NGINX_UPSTREAM"
  nginx -s reload || true
  docker rm -f "$container" >/dev/null 2>&1 || true
  echo "nginx reload failed; previous upstream restored" >&2
  exit 1
fi
rm -f "$previous"
install -d -m 0755 "$(dirname "$ACTIVE_FILE")"
printf '%s\n' "$next" > "$ACTIVE_FILE"
sleep "${DRAIN_SECONDS:-30}"
docker rm -f "go-platform-gateway-$active" >/dev/null 2>&1 || true
printf 'activated %s on port %s\n' "$next" "$port"
