#!/usr/bin/env sh
set -eu

: "${RESTORE_TEST_DATABASE_URL:?set RESTORE_TEST_DATABASE_URL to an empty disposable database}"
case "$(printf '%s' "$RESTORE_TEST_DATABASE_URL" | tr '[:upper:]' '[:lower:]')" in
  *restore*|*test*|*disposable*) ;;
  *) echo "refusing --clean restore without restore/test/disposable in target URL" >&2; exit 1 ;;
esac
BACKUP_DIR="${BACKUP_DIR:-./backups}"
LATEST="$(find "$BACKUP_DIR" -type f -name 'postgres-*.dump' -print | sort | tail -1)"
[ -n "$LATEST" ] || { echo "no postgres backup found" >&2; exit 1; }

pg_restore --exit-on-error --clean --if-exists --no-owner --no-acl \
  --dbname "$RESTORE_TEST_DATABASE_URL" "$LATEST"
psql "$RESTORE_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -c \
  "SELECT count(*) AS restored_tables FROM information_schema.tables WHERE table_schema IN ('auth','users','rbac','audit');"
printf 'restore verified: %s\n' "$LATEST"
