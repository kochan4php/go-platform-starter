#!/usr/bin/env node
// Bundle-size budget gate (PLAN item 68). Fails when the host build's JS
// payload exceeds the budget in apps/web/budget.json.
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const dist = process.env.BUDGET_DIST || fileURLToPath(new URL("../apps/web/dist/assets", import.meta.url));
const budget = JSON.parse(
  readFileSync(
    process.env.BUDGET_FILE || fileURLToPath(new URL("../apps/web/budget.json", import.meta.url)),
    "utf8",
  ),
);

let totalJs = 0;
const chunks = [];
for (const f of readdirSync(dist)) {
  const p = join(dist, f);
  if (f.endsWith(".js")) {
    const bytes = statSync(p).size;
    totalJs += bytes;
    chunks.push({ file: f, kb: Math.round(bytes / 1024) });
  }
}
const kb = Math.round(totalJs / 1024);
const delta = kb - (budget.baselineJsKb ?? kb);

console.log(`host JS payload: ${kb} KB (budget ${budget.totalJsKb} KB)`);
console.log(
  `chunks: ${chunks
    .sort((a, b) => b.kb - a.kb)
    .map(({ file, kb: size }) => `${file}=${size}KB`)
    .join(", ")}`,
);
writeFileSync(
  fileURLToPath(new URL("../apps/web/dist/bundle-summary.md", import.meta.url)),
  `## Bundle size diff\n\nHost JavaScript: **${kb} KB** (${delta >= 0 ? "+" : ""}${delta} KB versus committed baseline), budget ${budget.totalJsKb} KB.\n\n${chunks.map(({ file, kb: size }) => `- \`${file}\`: ${size} KB`).join("\n")}\n`,
);
if (kb > budget.totalJsKb) {
  console.error(`BUNDLE BUDGET EXCEEDED: ${kb} KB > ${budget.totalJsKb} KB`);
  process.exit(1);
}
