#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const safeRoot = root.replaceAll("\\", "/").replace(/\/$/, "");
const base = process.argv[2];
const current = JSON.parse(readFileSync(join(root, "packages/contracts/gen/openapi.json"), "utf8"));
let previous = { paths: {} };
if (base) {
  try {
    previous = JSON.parse(
      execFileSync(
        "git",
        ["-c", `safe.directory=${safeRoot}`, "show", `${base}:packages/contracts/gen/openapi.json`],
        {
          cwd: root,
          encoding: "utf8",
        },
      ),
    );
  } catch {
    console.log(
      "API changelog: no aggregate spec exists at the base revision; treating every operation as new.",
    );
  }
}

const methods = ["get", "head", "post", "put", "patch", "delete"];
const operations = (spec) =>
  new Map(
    Object.entries(spec.paths ?? {}).flatMap(([path, item]) =>
      methods
        .filter((method) => item[method])
        .map((method) => [`${method.toUpperCase()} ${path}`, JSON.stringify(item[method])]),
    ),
  );
const before = operations(previous);
const after = operations(current);
const added = [...after.keys()].filter((key) => !before.has(key));
const removed = [...before.keys()].filter((key) => !after.has(key));
const changed = [...after.keys()].filter((key) => before.has(key) && before.get(key) !== after.get(key));

console.log("# API contract changelog");
for (const [title, entries] of [
  ["Added", added],
  ["Removed (breaking)", removed],
  ["Changed", changed],
]) {
  console.log(`\n## ${title} (${entries.length})`);
  console.log(entries.length ? entries.map((entry) => `- ${entry}`).join("\n") : "- None");
}
if (removed.length) process.exitCode = 2;
