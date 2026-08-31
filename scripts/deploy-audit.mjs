#!/usr/bin/env node
import { appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const [status, environment, revision, previous] = process.argv.slice(2);
const path = process.env.DEPLOY_AUDIT_LOG ?? "tmp/deploy-audit.jsonl";
mkdirSync(dirname(path), { recursive: true });
appendFileSync(
  path,
  `${JSON.stringify({
    at: new Date().toISOString(),
    actor: process.env.GITHUB_ACTOR ?? process.env.BUILD_USER_ID ?? process.env.USER ?? "unknown",
    status,
    environment,
    revision,
    previous,
    run: process.env.GITHUB_RUN_ID ?? process.env.BUILD_URL ?? "local",
    freezeOverride: process.env.CHANGE_FREEZE_OVERRIDE === "true",
  })}\n`,
);
