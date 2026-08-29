#!/usr/bin/env sh
set -eu

: "${REDIS_ADDR:=127.0.0.1:6379}"
host="${REDIS_ADDR%:*}"
port="${REDIS_ADDR##*:}"
args="-h $host -p $port"
[ -z "${REDIS_EXPORTER_USER:-}" ] || args="$args --user $REDIS_EXPORTER_USER"

# redis-cli deliberately uses SCAN here; it never blocks Redis with KEYS *.
REDISCLI_AUTH="${REDIS_EXPORTER_PASSWORD:-}" redis-cli $args --bigkeys
