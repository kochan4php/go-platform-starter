#!/usr/bin/env bash
# UAT deploy: acceptance-testing stack for a VPS. Reads infra/.env.uat
# (template: infra/.env.uat.example).
#
#   sudo DOMAIN=uat.example.com ./scripts/deploy-uat.sh     # first deploy
#   sudo ./scripts/deploy-uat.sh                            # every update
#   sudo ./scripts/deploy-uat.sh --down                     # stop
exec "$(dirname "$0")/deploy.sh" uat "$@"
