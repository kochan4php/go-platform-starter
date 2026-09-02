#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const skipped = new Set([
  ".git",
  ".cache",
  ".pnpm-store",
  "coverage",
  "dist",
  "graphify-out",
  "node_modules",
  "test-results",
  "tmp",
]);

function walk(directory = root) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory() && skipped.has(entry.name)) return [];
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

function envProblems(files) {
  const problems = [];
  const examples = files.filter((path) =>
    /(?:^|\.)env(?:\.[^.]+)?\.example$/.test(path.replaceAll("\\", "/").split("/").at(-1)),
  );
  const documented = new Set();
  for (const path of examples) {
    const seen = new Set();
    for (const [index, line] of readFileSync(path, "utf8").split(/\r?\n/).entries()) {
      if (!line.trim() || line.trimStart().startsWith("#")) continue;
      const match = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
      if (!match) problems.push(`${relative(root, path)}:${index + 1}: invalid env assignment`);
      else if (seen.has(match[1]))
        problems.push(`${relative(root, path)}:${index + 1}: duplicate ${match[1]}`);
      else {
        seen.add(match[1]);
        documented.add(match[1]);
      }
    }
  }
  for (const path of files.filter((path) => path.endsWith(".go") && !path.endsWith("_test.go"))) {
    for (const match of readFileSync(path, "utf8").matchAll(
      /`env:"([A-Z][A-Z0-9_]*)(,required)?"(?:\s+envDefault:"[^"]*")?`/g,
    )) {
      if (match[2] && !documented.has(match[1]))
        problems.push(`${relative(root, path)}: required env ${match[1]} is undocumented`);
    }
  }
  return problems;
}

function todoProblems(files) {
  const allowed = /\b(?:TODO|FIXME)\b\s*(?:\(#\d+\)|\(https:\/\/github\.com\/[^\s)]+\/issues\/\d+\))/;
  const ignored = new Set(["docs/BACKLOG.md", "docs/DEVELOPER_EXPERIENCE.md", "scripts/check-devx.mjs"]);
  const problems = [];
  for (const path of files) {
    const name = relative(root, path).replaceAll("\\", "/");
    if (ignored.has(name) || /\.(?:png|webm|sum|lock)$/.test(name)) continue;
    for (const [index, line] of readFileSync(path, "utf8").split(/\r?\n/).entries()) {
      if (/\b(?:TODO|FIXME)\b/.test(line) && !allowed.test(line))
        problems.push(`${name}:${index + 1}: TODO/FIXME needs an issue link`);
    }
  }
  return problems;
}

function generatedProblems(files) {
  const generated = files.filter(
    (path) =>
      /services[\\/][^\\/]+[\\/]gen[\\/].+\.go$/.test(path) ||
      path.endsWith(join("packages", "contracts", "src", "gen.d.ts")),
  );
  return generated
    .filter((path) => !/(Code generated|auto-generated)/i.test(readFileSync(path, "utf8").slice(0, 500)))
    .map((path) => `${relative(root, path)}: generated-code header missing`);
}

function wrappingProblems(files) {
  const problems = [];
  for (const path of files.filter((path) => path.endsWith(".go") && !/[\\/]gen[\\/]/.test(path))) {
    for (const [index, line] of readFileSync(path, "utf8").split(/\r?\n/).entries()) {
      if (/fmt\.Errorf\(.*\berr\b/.test(line) && !line.includes("%w"))
        problems.push(`${relative(root, path)}:${index + 1}: wrap errors with %w`);
    }
  }
  return problems;
}

function policyProblems() {
  const problems = [];
  const makefile = readFileSync(join(root, "Makefile"), "utf8");
  for (const target of ["dev-test", "open", "seed-reset", "check-env", "test-watch", "psql", "redis-cli"])
    if (!new RegExp(`^${target}:`, "m").test(makefile)) problems.push(`Makefile: target ${target} missing`);
  for (const path of [
    ".editorconfig",
    ".devcontainer/devcontainer.json",
    ".github/CODEOWNERS",
    ".github/pull_request_template.md",
    ".husky/pre-commit",
    ".husky/commit-msg",
    ".vscode/launch.json",
    "CONTRIBUTING.md",
    "GOVERNANCE.md",
    "docs/DEVELOPER_EXPERIENCE.md",
    "docs/templates/ADR.md",
  ])
    if (!existsSync(join(root, path))) problems.push(`${path}: required DX artifact missing`);
  const release = readFileSync(join(root, ".github", "workflows", "release.yml"), "utf8");
  if (!release.includes("release-please-action") || !release.includes("component-changelog.mjs"))
    problems.push("release.yml: release notes are not verified");
  const changelog = readFileSync(join(root, "CHANGELOG.md"), "utf8");
  if (!/## \[Unreleased\][\s\S]+?^### /m.test(changelog))
    problems.push("CHANGELOG.md: Unreleased notes are empty");
  return problems;
}

export function findProblems() {
  const files = walk();
  return [
    ...envProblems(files),
    ...todoProblems(files),
    ...generatedProblems(files),
    ...wrappingProblems(files),
    ...policyProblems(),
  ];
}

const problems = findProblems();
if (problems.length) {
  console.error(problems.join("\n"));
  process.exitCode = 1;
} else console.log("developer-experience policy OK");
