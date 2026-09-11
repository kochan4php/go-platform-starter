#!/usr/bin/env bash
# LAB deploy: local docker compose stack for development and debugging.
# Every service port is published, debug logging is on, the mailer prints to
# stdout, and both seeds run.
#
#   ./scripts/deploy-lab.sh              # start / update
#   ./scripts/deploy-lab.sh --down       # stop and remove
#   ./scripts/deploy-lab.sh --skip-build # reuse images
exec "$(dirname "$0")/deploy.sh" lab "$@"
