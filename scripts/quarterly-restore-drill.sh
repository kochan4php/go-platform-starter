#!/usr/bin/env sh
set -eu

STARTED="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
START_SECONDS="$(date +%s)"
"$(dirname "$0")/restore-test.sh"
FINISHED="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
DURATION="$(( $(date +%s) - START_SECONDS ))"
LOG="${RESTORE_DRILL_LOG:-./backups/restore-drills.csv}"
mkdir -p "$(dirname "$LOG")"
[ -f "$LOG" ] || printf 'started_at,finished_at,duration_seconds,result\n' > "$LOG"
printf '%s,%s,%s,passed\n' "$STARTED" "$FINISHED" "$DURATION" >> "$LOG"
printf 'restore drill passed in %ss; evidence: %s\n' "$DURATION" "$LOG"
