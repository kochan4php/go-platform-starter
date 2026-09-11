#!/usr/bin/env sh
set -eu

BASE_URL="${1:?usage: smoke-deploy.sh BASE_URL}"
BASE_URL="${BASE_URL%/}"

fetch() {
  curl --fail-with-body --silent --show-error --retry 10 --retry-delay 2 --retry-connrefused "$BASE_URL$1"
}

fetch /healthz | grep -q '"status"'
fetch /readyz | grep -q '"status"'
fetch /version | grep -q '"commit"'
fetch /docs/openapi.json | grep -q '"openapi"'
fetch / | grep -qi '<!doctype html'
for remote in auth admin-users admin-roles; do
  fetch "/remote/$remote/assets/remoteEntry.js" >/dev/null
done
printf 'post-deploy smoke passed: %s\n' "$BASE_URL"
