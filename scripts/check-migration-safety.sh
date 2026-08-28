#!/usr/bin/env sh
set -eu

BASE="${1:-origin/main}"
FILES="$(git diff --name-only "$BASE"...HEAD -- 'services/*/migrations/*.up.sql' || true)"
[ -n "$FILES" ] || { echo "no changed up migrations"; exit 0; }

for file in $FILES; do
  if grep -Eiq '(^|[[:space:]])(DROP[[:space:]]+(TABLE|COLUMN)|ALTER[[:space:]]+COLUMN.*TYPE|RENAME[[:space:]]+(TABLE|COLUMN))' "$file" \
     && ! grep -Eiq 'zero-downtime:[[:space:]]*reviewed' "$file"; then
    echo "$file contains a blocking/destructive change without 'zero-downtime: reviewed'" >&2
    exit 1
  fi
done
echo "migration expand/contract check passed"
