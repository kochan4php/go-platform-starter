#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const base = process.argv[2];
if (!base) throw new Error("usage: openapi-diff.mjs <base-ref>");
const outputDir = join(root, "test-results", "oasdiff");
rmSync(outputDir, { recursive: true, force: true });
mkdirSync(outputDir, { recursive: true });
const report = ["# OpenAPI change report", ""];
let breaking = false;

for (const service of readdirSync(join(root, "services"))) {
  const current = join(root, "services", service, "openapi.yaml");
  if (!existsSync(current)) continue;
  const repoPath = relative(root, current).replaceAll("\\", "/");
  const old = join(outputDir, `${service}-base.yaml`);
  const previous = spawnSync("git", ["show", `${base}:${repoPath}`], { cwd: root, encoding: "utf8" });
  if (previous.status !== 0) continue;
  writeFileSync(old, previous.stdout);
  const changes = spawnSync("oasdiff", ["changelog", "-f", "markdown", old, current], {
    cwd: root,
    encoding: "utf8",
  });
  report.push(`## ${service}`, "", changes.stdout.trim() || "No consumer-visible changes.", "");
  const gate = spawnSync("oasdiff", ["breaking", "-f", "markdown", old, current], {
    cwd: root,
    encoding: "utf8",
  });
  if (gate.error) throw gate.error;
  if (gate.status !== 0) {
    breaking = true;
    report.push("### Breaking changes", "", gate.stdout.trim() || gate.stderr.trim(), "");
  }
}

writeFileSync(join(root, "test-results", "oasdiff.md"), `${report.join("\n").trim()}\n`);
console.log(report.join("\n"));
if (breaking) process.exitCode = 1;
