#!/usr/bin/env sh
set -eu

: "${DATABASE_URL:?set DATABASE_URL to a disposable database at the migration's prior version}"
[ "$#" -gt 0 ] || { echo "usage: scripts/migration-dry-run.sh migration.sql [...]" >&2; exit 2; }

for file in "$@"; do
  [ -f "$file" ] || { echo "missing migration: $file" >&2; exit 1; }
  if grep -Eiq 'no-transaction:|\b(CONCURRENTLY|VACUUM)\b' "$file"; then
    echo "skip transaction-incompatible migration (covered by round-trip CI): $file"
    continue
  fi
  { printf 'BEGIN;\n'; sed '/^[[:space:]]*\\/d' "$file"; printf '\nROLLBACK;\n'; } |
    psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -X -q
  echo "dry-run rollback OK: $file"
done
