#!/usr/bin/env node
import { readFileSync } from "node:fs";

const entries = JSON.parse(
  readFileSync(new URL("../tests/quarantine/quarantine.json", import.meta.url), "utf8"),
);
const invalid = entries.filter(
  (entry) =>
    !entry.test || !entry.owner || !entry.issue || !entry.expires || new Date(entry.expires) < new Date(),
);
if (invalid.length) {
  console.error(
    `invalid or expired quarantines: ${invalid.map((entry) => entry.test ?? "unknown").join(", ")}`,
  );
  process.exit(1);
}
console.log(`quarantine policy OK: ${entries.length} active entries`);
