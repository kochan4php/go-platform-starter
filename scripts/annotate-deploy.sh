#!/usr/bin/env sh
set -eu

: "${GRAFANA_URL:?set GRAFANA_URL}"
: "${GRAFANA_TOKEN:?set GRAFANA_TOKEN}"

environment="${1:-unknown}"
commit="${GIT_COMMIT:-unknown}"
version="${APP_VERSION:-$commit}"
payload="$(printf '{"tags":["deploy","%s"],"text":"deploy %s (%s) to %s"}' "$environment" "$version" "$commit" "$environment")"

curl --fail --silent --show-error \
  -H "Authorization: Bearer $GRAFANA_TOKEN" \
  -H "Content-Type: application/json" \
  --data "$payload" \
  "${GRAFANA_URL%/}/api/annotations" >/dev/null
