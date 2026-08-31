#!/usr/bin/env sh
set -eu

BASE_URL="${1:?usage: smoke-deploy.sh BASE_URL}"
curl --fail-with-body --retry 5 --retry-delay 2 "$BASE_URL/healthz" >/dev/null
curl --fail-with-body --retry 5 --retry-delay 2 "$BASE_URL/version" >/dev/null
curl --fail-with-body --retry 5 --retry-delay 2 "$BASE_URL/docs/openapi.json" >/dev/null
printf 'post-deploy smoke passed: %s\n' "$BASE_URL"
