#!/usr/bin/env node
// Bundle-size budget gate (PLAN item 68). Fails when the host build's JS
// payload exceeds the budget in apps/web/budget.json.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const dist = fileURLToPath(new URL("../apps/web/dist/assets", import.meta.url));
const budget = JSON.parse(
  readFileSync(fileURLToPath(new URL("../apps/web/budget.json", import.meta.url)), "utf8"),
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

console.log(`host JS payload: ${kb} KB (budget ${budget.totalJsKb} KB)`);
console.log(
  `chunks: ${chunks
    .sort((a, b) => b.kb - a.kb)
    .map(({ file, kb: size }) => `${file}=${size}KB`)
    .join(", ")}`,
);
if (kb > budget.totalJsKb) {
  console.error(`BUNDLE BUDGET EXCEEDED: ${kb} KB > ${budget.totalJsKb} KB`);
  process.exit(1);
}
