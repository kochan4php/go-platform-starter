#!/usr/bin/env sh
set -eu

: "${ADMIN_CIDRS:?set ADMIN_CIDRS to a space-separated list of trusted SSH CIDRs}"
SSH_PORT="${SSH_PORT:-22}"
[ "${1:-}" = "--apply" ] || {
  printf 'dry run: allow tcp/%s from [%s], allow tcp/80 and tcp/443, deny all other inbound\n' "$SSH_PORT" "$ADMIN_CIDRS"
  printf 're-run with --apply after verifying an independent console is available\n'
  exit 0
}

case " $ADMIN_CIDRS " in
  *" 0.0.0.0/0 "*|*" ::/0 "*) echo "refusing globally exposed SSH" >&2; exit 1 ;;
esac

command -v ufw >/dev/null 2>&1 || { echo "ufw is required" >&2; exit 1; }
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
for cidr in $ADMIN_CIDRS; do
  ufw allow from "$cidr" to any port "$SSH_PORT" proto tcp
done
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
ufw status verbose
