#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const ignored = new Set(["node_modules", ".git", "graphify-out", "site"]);
function markdownFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (ignored.has(entry.name)) return [];
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return markdownFiles(path);
    return entry.isFile() && extname(path).toLowerCase() === ".md" ? [path] : [];
  });
}

const required = [
  "README.md",
  "SECURITY.md",
  "CONTRIBUTING.md",
  "CODE_OF_CONDUCT.md",
  "GOVERNANCE.md",
  "SUPPORT.md",
  "CHANGELOG.md",
  "mkdocs.yml",
  "docs/index.md",
  "docs/RUNBOOK.md",
  "docs/INCIDENT_RESPONSE.md",
  "docs/OWNERSHIP.md",
];
const failures = required.filter((path) => !existsSync(join(root, path))).map((path) => `missing ${path}`);

for (const file of markdownFiles(root)) {
  const content = readFileSync(file, "utf8");
  for (const match of content.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g)) {
    const raw = match[1]
      .trim()
      .replace(/^<|>$/g, "")
      .split(/\s+["']/)[0];
    const target = decodeURIComponent(raw.split("#")[0]);
    if (!target || /^(https?:|mailto:|data:)/i.test(target)) continue;
    const path = target.startsWith("/") ? join(root, target.slice(1)) : resolve(dirname(file), target);
    if (!existsSync(path)) failures.push(`${relative(root, file)}: broken link ${raw}`);
  }
}

const readme = readFileSync(join(root, "README.md"), "utf8");
for (const marker of [
  "actions/workflows/ci.yml",
  "coverage.svg",
  "go-1.27",
  "license-MIT",
  "dashboard.png",
  "quickstart.webm",
]) {
  if (!readme.includes(marker)) failures.push(`README missing ${marker}`);
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log(
  `docs OK: ${markdownFiles(root).length} Markdown files, local links and required governance artifacts valid`,
);
