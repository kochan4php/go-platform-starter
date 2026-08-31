#!/usr/bin/env bash
# DEMO deploy: stakeholder-facing playground for a VPS. Reads infra/.env.demo
# (template: infra/.env.production.example; set STACK_ENV=demo). Mailer defaults to console so nothing
# real is ever sent.
#
#   sudo DOMAIN=demo.example.com ./scripts/deploy-demo.sh   # first deploy
#   sudo ./scripts/deploy-demo.sh                           # every update
#   sudo ./scripts/deploy-demo.sh --down                    # stop
exec "$(dirname "$0")/deploy.sh" demo "$@"
