#!/usr/bin/env sh
set -eu

BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$BACKUP_DIR"

: "${DATABASE_URL:?set DATABASE_URL}"
pg_dump --format=custom --no-owner --no-acl --file "$BACKUP_DIR/postgres-$STAMP.dump" "$DATABASE_URL"

if [ -n "${REDIS_ADDR:-}" ]; then
  REDIS_HOST="${REDIS_ADDR%:*}"
  REDIS_PORT="${REDIS_ADDR##*:}"
  redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" ${REDIS_USERNAME:+--user "$REDIS_USERNAME"} ${REDIS_PASSWORD:+--pass "$REDIS_PASSWORD"} \
    --rdb "$BACKUP_DIR/redis-$STAMP.rdb"
fi

find "$BACKUP_DIR" -type f \( -name 'postgres-*.dump' -o -name 'redis-*.rdb' \) -mtime "+$RETENTION_DAYS" -delete
printf 'backup complete: %s\n' "$STAMP"
