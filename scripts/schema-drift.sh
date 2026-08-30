#!/usr/bin/env sh
set -eu

: "${SOURCE_DATABASE_URL:?set SOURCE_DATABASE_URL}"
: "${TARGET_DATABASE_URL:?set TARGET_DATABASE_URL}"

go run ./cmd/dbdocs -database-url "$SOURCE_DATABASE_URL" -compare-url "$TARGET_DATABASE_URL"
