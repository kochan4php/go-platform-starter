#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";

const reports = JSON.parse(readFileSync("lighthouse-results/manifest.json", "utf8"));
const rows = reports.map((report, index) => {
  const summary = report.summary ?? {};
  return `| ${index + 1} | ${Math.round((summary.performance ?? 0) * 100)} | ${Math.round((summary.accessibility ?? 0) * 100)} | ${report.url ?? "preview"} |`;
});
writeFileSync(
  "lighthouse-results/summary.md",
  `## Lighthouse\n\n| Run | Performance | Accessibility | URL |\n| ---: | ---: | ---: | --- |\n${rows.join("\n")}\n`,
);
