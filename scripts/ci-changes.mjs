#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";

const base = process.argv[2];
let files;
if (process.env.CHANGED_FILES !== undefined) {
  files = process.env.CHANGED_FILES.split(/\r?\n/).filter(Boolean);
} else {
  const ref = base && !/^0+$/.test(base) ? base : "HEAD^";
  try {
    files = execFileSync("git", ["diff", "--name-only", `${ref}...HEAD`], { encoding: "utf8" })
      .split(/\r?\n/)
      .filter(Boolean);
  } catch {
    files = ["go.mod", "package.json"];
  }
}

const matches = (patterns) => files.some((file) => patterns.some((pattern) => pattern.test(file)));
const global = matches([
  /^\.github\/workflows\/ci\.yml$/,
  /^Makefile$/,
  /^scripts\/(?:ci-changes|run-with-retry|quality-gates)\.mjs$/,
]);
const result = {
  go: global || matches([/\.go$/, /^go\.(?:mod|sum)$/, /^services\//, /^internal\//, /^infra\//]),
  web: global || matches([/\.(?:ts|tsx|js|mjs|css|html)$/, /^apps\//, /^packages\//, /^pnpm-lock\.yaml$/]),
  e2e: global || matches([/^e2e\//, /^apps\//, /^services\//, /^infra\//, /^scripts\/e2e-mesh\.sh$/]),
  security:
    global ||
    matches([
      /^\.github\//,
      /^infra\//,
      /^scripts\/(?:promote|deploy|smoke|check-deploy|check-change|registry-retention)/,
      /Dockerfile$/,
      /^go\.(?:mod|sum)$/,
      /^pnpm-lock\.yaml$/,
    ]),
  docs: matches([/\.md$/, /^docs\//, /^mkdocs\.yml$/]),
};
if (!files.length) {
  for (const key of Object.keys(result)) result[key] = true;
}

const output = process.env.GITHUB_OUTPUT;
if (output)
  appendFileSync(
    output,
    `${Object.entries(result)
      .map(([key, value]) => `${key}=${value}`)
      .join("\n")}\n`,
  );
console.log(JSON.stringify({ files, ...result }));
