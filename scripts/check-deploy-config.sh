#!/usr/bin/env sh
set -eu

ROOT="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT HUP INT TERM

"$ROOT/scripts/deploy.sh" lab --check

for target in uat demo prod; do
  env_file="$TMP/$target.env"
  sed \
    -e "s/^STACK_ENV=.*/STACK_ENV=$target/" \
    -e "s/example\.com/$target.example.test/g" \
    -e 's/^AGE_BACKUP_RECIPIENT=.*/AGE_BACKUP_RECIPIENT=age1testonly000000000000000000000000000000000000000000000000000/' \
    "$ROOT/infra/.env.production.example" > "$env_file"
  if [ "$target" != "prod" ]; then
    sed '/^AGE_BACKUP_RECIPIENT=/d' "$env_file" > "$env_file.no-backup"
    mv "$env_file.no-backup" "$env_file"
  fi
  before="$(cksum "$env_file")"
  ENV_FILE="$env_file" "$ROOT/scripts/deploy.sh" "$target" --no-pull --check
  [ "$(cksum "$env_file")" = "$before" ] || { echo "$target --check modified its env file" >&2; exit 1; }
done

printf 'deployment configuration OK: lab, uat, demo, prod\n'
