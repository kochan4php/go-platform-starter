#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const separator = process.argv.indexOf("--");
const reportIndex = process.argv.indexOf("--report");
const report = reportIndex >= 0 ? process.argv[reportIndex + 1] : "test-results/flaky.json";
const command = separator >= 0 ? process.argv.slice(separator + 1) : [];
if (!command.length) {
  console.error("usage: run-with-retry.mjs [--report file] -- command [args...]");
  process.exit(2);
}

const run = () => spawnSync(command[0], command.slice(1), { stdio: "inherit" });
const first = run();
let second;
if (first.status !== 0) second = run();
const flaky = first.status !== 0 && second?.status === 0;
const passed = first.status === 0 || second?.status === 0;
mkdirSync(dirname(report), { recursive: true });
writeFileSync(report, `${JSON.stringify({ command, flaky, passed, attempts: second ? 2 : 1 }, null, 2)}\n`);
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `flaky=${flaky}\n`);
process.exit(passed ? 0 : (second?.status ?? first.status ?? 1));
