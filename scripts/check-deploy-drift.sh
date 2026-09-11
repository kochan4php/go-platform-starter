#!/usr/bin/env sh
set -eu

BASE_URL="${1:?usage: check-deploy-drift.sh BASE_URL EXPECTED_REVISION}"
EXPECTED="${2:?usage: check-deploy-drift.sh BASE_URL EXPECTED_REVISION}"
ACTUAL="$(curl --fail-with-body --silent "$BASE_URL/version" | sed -n 's/.*"commit"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')"
[ -n "$ACTUAL" ] || { echo "version endpoint did not expose commit" >&2; exit 1; }
case "$EXPECTED" in "$ACTUAL"*|*"$ACTUAL"*) printf 'deployment in sync: %s\n' "$ACTUAL" ;; *) echo "deployment drift: expected $EXPECTED, got $ACTUAL" >&2; exit 1 ;; esac
