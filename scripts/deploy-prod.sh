#!/usr/bin/env bash
# Production deploy: protected VPS stack. Reads infra/.env.production.
#
#   sudo AGE_BACKUP_RECIPIENT=age1... DOMAIN=example.com ./scripts/deploy-prod.sh
#   sudo ./scripts/deploy-prod.sh --check
#   sudo ./scripts/deploy-prod.sh --down
exec "$(dirname "$0")/deploy.sh" prod "$@"
