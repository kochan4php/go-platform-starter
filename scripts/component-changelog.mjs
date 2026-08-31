#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const from = process.argv[2] ?? "HEAD^";
const to = process.argv[3] ?? "HEAD";
const output = process.argv[4] ?? "release-notes";
const components = [
  ...["auth", "users", "rbac", "worker", "realtime", "scheduler", "gateway"].map((name) => [
    `service-${name}`,
    `services/${name}/`,
  ]),
  ...["web", "web-auth", "web-admin-users", "web-admin-roles"].map((name) => [
    `app-${name}`,
    `apps/${name}/`,
  ]),
  ["platform", "internal/"],
];
mkdirSync(output, { recursive: true });
for (const [name, path] of components) {
  const commits = execFileSync("git", ["log", "--format=- %s (%h)", `${from}..${to}`, "--", path], {
    encoding: "utf8",
  }).trim();
  writeFileSync(join(output, `${name}.md`), `# ${name}\n\n${commits || "No component changes."}\n`);
}
console.log(`component changelogs written to ${output}`);
