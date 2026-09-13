#!/usr/bin/env node
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// lhci collect always writes one lhr-<timestamp>.json per run into .lighthouseci.
// The manifest.json the filesystem upload target produces lands there too rather
// than in the configured outputDir, so read the reports themselves and skip the
// indirection.
const reportDir = ".lighthouseci";
const rows = readdirSync(reportDir)
  .filter((name) => name.startsWith("lhr-") && name.endsWith(".json"))
  .sort()
  .map((name, index) => {
    const report = JSON.parse(readFileSync(join(reportDir, name), "utf8"));
    const categories = report.categories ?? {};
    const score = (key) => Math.round((categories[key]?.score ?? 0) * 100);
    return `| ${index + 1} | ${score("performance")} | ${score("accessibility")} | ${report.finalDisplayedUrl ?? "preview"} |`;
  });

mkdirSync("lighthouse-results", { recursive: true });
writeFileSync(
  "lighthouse-results/summary.md",
  `## Lighthouse\n\n| Run | Performance | Accessibility | URL |\n| ---: | ---: | ---: | --- |\n${rows.join("\n")}\n`,
);
