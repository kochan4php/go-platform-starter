#!/usr/bin/env sh
set -eu

: "${SOURCE_DATABASE_URL:?set SOURCE_DATABASE_URL}"
: "${TARGET_DATABASE_URL:?set TARGET_DATABASE_URL to an empty non-production database}"

case "$(printf '%s' "$TARGET_DATABASE_URL" | tr '[:upper:]' '[:lower:]')" in
  *dev*|*test*|*staging*|*anon*) ;;
  *) echo "refusing to overwrite target without dev/test/staging/anon in its URL" >&2; exit 1 ;;
esac

tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT INT TERM
dump="$tmp_dir/source.dump"

pg_dump --format=custom --no-owner --no-acl --file "$dump" "$SOURCE_DATABASE_URL"
pg_restore --exit-on-error --clean --if-exists --no-owner --no-acl --dbname "$TARGET_DATABASE_URL" "$dump"

psql "$TARGET_DATABASE_URL" -v ON_ERROR_STOP=1 -X <<'SQL'
BEGIN;
UPDATE users.users
SET email = 'dev+' || id || '@example.invalid',
    password_hash = 'masked', password_history = '{}', mfa_secret_enc = '',
    display_name = CASE WHEN display_name = '' THEN '' ELSE 'User ' || id END,
    avatar_url = '', last_login_ip = '', last_login_user_agent = '', metadata = '{}';
UPDATE auth.sessions
SET refresh_token_hash = 'masked-' || id, user_agent = '', ip = '', metadata = '{}';
UPDATE audit.audit_logs SET actor_sub = '', entity_id = '', meta = '{}';
UPDATE audit.event_outbox SET payload = '{}'::jsonb;
TRUNCATE auth.change_log, users.change_log, rbac.change_log RESTART IDENTITY;
COMMIT;
SQL

if [ -n "${ANONYMIZED_DUMP:-}" ]; then
  pg_dump --format=custom --no-owner --no-acl --file "$ANONYMIZED_DUMP" "$TARGET_DATABASE_URL"
  echo "anonymized development dataset written: $ANONYMIZED_DUMP"
else
  echo "masked staging copy ready"
fi
