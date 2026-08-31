#!/usr/bin/env node
import { readFileSync } from "node:fs";
import YAML from "js-yaml";

const target = process.argv[2];
if (!target || !["uat", "demo", "prod"].includes(target)) {
  console.error("usage: check-change-freeze.mjs uat|demo|prod");
  process.exit(2);
}
if (process.env.CHANGE_FREEZE_OVERRIDE === "true") {
  console.log("change freeze override recorded");
  process.exit(0);
}
const now = new Date(process.env.CHANGE_FREEZE_NOW ?? Date.now());
const source = process.env.CHANGE_FREEZE_FILE ?? new URL("../infra/change-freeze.yml", import.meta.url);
const config = YAML.load(readFileSync(source, "utf8"));
const active = (config.windows ?? []).find(
  (window) =>
    (window.environments ?? []).includes(target) &&
    now >= new Date(window.startsAt) &&
    now < new Date(window.endsAt),
);
if (active) {
  console.error(
    `deployment blocked by change freeze: ${active.name} (${active.startsAt} - ${active.endsAt})`,
  );
  process.exit(1);
}
console.log(`no active change freeze for ${target}`);
