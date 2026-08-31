#!/usr/bin/env sh
set -eu

: "${AGE_RECIPIENT:?set AGE_RECIPIENT to an age public recipient}"
command -v age >/dev/null 2>&1 || { echo "age is required" >&2; exit 1; }
DESTINATION="${BACKUP_DIR:-./backups}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
PLAIN_DIR="$(mktemp -d)"
cleanup() { find "$PLAIN_DIR" -type f -delete; rmdir "$PLAIN_DIR"; }
trap cleanup EXIT HUP INT TERM

BACKUP_DIR="$PLAIN_DIR" "$(dirname "$0")/backup.sh"
mkdir -p "$DESTINATION"
umask 077
tar -C "$PLAIN_DIR" -cf - . | age -r "$AGE_RECIPIENT" -o "$DESTINATION/go-platform-$STAMP.tar.age"
sha256sum "$DESTINATION/go-platform-$STAMP.tar.age" > "$DESTINATION/go-platform-$STAMP.tar.age.sha256"
find "$DESTINATION" -type f \( -name 'go-platform-*.tar.age' -o -name 'go-platform-*.tar.age.sha256' \) -mtime "+${BACKUP_RETENTION_DAYS:-14}" -delete
printf 'encrypted backup complete: %s\n' "$DESTINATION/go-platform-$STAMP.tar.age"
