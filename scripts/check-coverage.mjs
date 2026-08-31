#!/usr/bin/env node
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const outDir = join(root, "coverage");
const profile = join(outDir, "go.out");
const minimum = Number(process.env.COVERAGE_MIN ?? 70);
mkdirSync(outDir, { recursive: true });

const listed = spawnSync(
  "go",
  ["list", "-f", "{{if or .TestGoFiles .XTestGoFiles}}{{.ImportPath}}{{end}}", "./..."],
  { cwd: root, encoding: "utf8" },
);
if (listed.status !== 0) {
  process.stderr.write(listed.stderr ?? "");
  process.exit(listed.status ?? 1);
}

const packages = listed.stdout.split(/\r?\n/).filter(Boolean);
const temporary = mkdtempSync(join(tmpdir(), "go-coverage-"));
const merged = ["mode: atomic"];
let failed = 0;
try {
  for (const [index, name] of packages.entries()) {
    const packageProfile = join(temporary, `${index}.out`);
    const run = spawnSync(
      "go",
      ["test", "-count=1", "-covermode=atomic", `-coverprofile=${packageProfile}`, name],
      { cwd: root, encoding: "utf8", stdio: ["inherit", "pipe", "pipe"] },
    );
    process.stdout.write(run.stdout ?? "");
    process.stderr.write(run.stderr ?? "");
    if (run.status !== 0) {
      failed = run.status ?? 1;
      break;
    }
    merged.push(...readFileSync(packageProfile, "utf8").split(/\r?\n/).slice(1).filter(Boolean));
  }
  if (!failed) writeFileSync(profile, `${merged.join("\n")}\n`);
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
if (failed) process.exit(failed);

const rows = readFileSync(profile, "utf8")
  .split(/\r?\n/)
  .slice(1)
  .flatMap((line) => {
    const match = line.match(/^(.+):(\d+)\.\d+,(\d+)\.\d+\s+(\d+)\s+(\d+)$/);
    return match
      ? [
          {
            file: match[1].replace(/^.*?go-platform-starter\//, ""),
            start: +match[2],
            end: +match[3],
            statements: +match[4],
            count: +match[5],
          },
        ]
      : [];
  });

function score(entries) {
  const total = entries.reduce((sum, row) => sum + row.statements, 0);
  const covered = entries.reduce((sum, row) => sum + (row.count > 0 ? row.statements : 0), 0);
  return { total, covered, percent: total ? (covered * 100) / total : 100 };
}

const byPackage = new Map();
for (const row of rows) {
  const name = dirname(row.file).replaceAll("\\", "/");
  byPackage.set(name, [...(byPackage.get(name) ?? []), row]);
}

const badgeDir = join(root, "docs/testing/badges");
mkdirSync(badgeDir, { recursive: true });
for (const [name, entries] of [...byPackage].sort(([a], [b]) => a.localeCompare(b))) {
  const { percent } = score(entries);
  const value = percent.toFixed(1);
  const color = percent >= minimum ? "2f855a" : percent >= 50 ? "b7791f" : "c53030";
  const safe = name.replaceAll("/", "-");
  const label = name.replaceAll("&", "&amp;");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="20" role="img" aria-label="${label} coverage ${value}%"><rect width="220" height="20" fill="#374151"/><rect x="220" width="80" height="20" fill="#${color}"/><g fill="#fff" font-family="Verdana,sans-serif" font-size="11"><text x="8" y="14">${label}</text><text x="232" y="14">${value}%</text></g></svg>\n`;
  writeFileSync(join(badgeDir, `${safe}.svg`), svg);
}

const base = process.argv[2] || process.env.COVERAGE_BASE;
const changedLines = new Map();
try {
  const range = base ? [`${base}...HEAD`] : ["HEAD"];
  const diff = execFileSync("git", ["diff", "--unified=0", "--no-color", ...range, "--", "*.go"], {
    cwd: root,
    encoding: "utf8",
  });
  let file = "";
  for (const line of diff.split(/\r?\n/)) {
    if (line.startsWith("+++ b/")) {
      file = line.slice(6).replaceAll("\\", "/");
      if (file.endsWith("_test.go") || file.includes("/gen/")) file = "";
      continue;
    }
    const hunk = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/);
    if (!file || !hunk) continue;
    const start = Number(hunk[1]);
    const count = Number(hunk[2] ?? 1);
    const lines = changedLines.get(file) ?? new Set();
    for (let n = start; n < start + count; n += 1) lines.add(n);
    changedLines.set(file, lines);
  }
} catch {
  console.warn(`coverage: diff ${base ?? "HEAD"} unavailable; report generated without diff gate`);
}
const changed = [...changedLines.keys()];
const changedRows = rows.filter((row) => {
  const lines = changedLines.get(row.file);
  if (!lines) return false;
  for (let n = row.start; n <= row.end; n += 1) if (lines.has(n)) return true;
  return false;
});
const changedScore = score(changedRows);
const overall = score(rows);
mkdirSync(join(root, "coverage"), { recursive: true });
writeFileSync(
  join(root, "coverage", "summary.md"),
  `## Go coverage\n\n| Scope | Coverage | Gate |\n| --- | ---: | ---: |\n| Overall | ${overall.percent.toFixed(1)}% | informational |\n| Changed production code | ${changed.length ? `${changedScore.percent.toFixed(1)}%` : "n/a"} | ${minimum}% |\n`,
);
{
  const value = overall.percent.toFixed(1);
  const color = overall.percent >= minimum ? "2f855a" : overall.percent >= 50 ? "b7791f" : "c53030";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="20" role="img" aria-label="coverage ${value}%"><rect width="88" height="20" fill="#374151"/><rect x="88" width="72" height="20" fill="#${color}"/><g fill="#fff" font-family="Verdana,sans-serif" font-size="11"><text x="8" y="14">coverage</text><text x="101" y="14">${value}%</text></g></svg>\n`;
  writeFileSync(join(badgeDir, "coverage.svg"), svg);
}
console.log(
  `coverage report: ${overall.percent.toFixed(1)}% overall; ${byPackage.size} package badges generated`,
);
if (changed.length === 0) {
  console.log(`coverage gate: no changed Go production files (minimum ${minimum}%)`);
} else if (changedScore.percent < minimum) {
  console.error(
    `CHANGED-CODE COVERAGE FAILED: ${changedScore.percent.toFixed(1)}% < ${minimum}% (${changed.join(", ")})`,
  );
  process.exit(1);
} else {
  console.log(`coverage gate: ${changedScore.percent.toFixed(1)}% changed-code coverage >= ${minimum}%`);
}
