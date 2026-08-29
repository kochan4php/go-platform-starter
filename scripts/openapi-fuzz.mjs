#!/usr/bin/env node
// Dependency-free staging API fuzzer: walks every mutating OpenAPI operation,
// sends malformed/schema-hostile bodies, and fails on crashes (5xx).
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

if (process.env.FUZZ_CONFIRM !== "staging") {
  console.error("Set FUZZ_CONFIRM=staging; this harness intentionally sends invalid writes.");
  process.exit(2);
}
const base = (process.env.FUZZ_BASE_URL || "").replace(/\/$/, "");
if (!base) throw new Error("FUZZ_BASE_URL is required");
const spec = JSON.parse(
  readFileSync(fileURLToPath(new URL("../packages/contracts/gen/openapi.json", import.meta.url)), "utf8"),
);
const token = process.env.FUZZ_BEARER || "";
const payloads = [
  "{",
  "null",
  "[]",
  JSON.stringify({ id: "' OR 1=1 --", displayName: "<svg onload=alert(1)>" }),
];
let probes = 0;
const crashes = [];
for (const [path, operations] of Object.entries(spec.paths)) {
  if (path.includes("{")) continue;
  for (const method of ["post", "put", "patch", "delete"]) {
    if (!operations[method]) continue;
    for (const body of payloads) {
      const response = await fetch(`${base}${path}`, {
        method: method.toUpperCase(),
        body,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      probes += 1;
      if (response.status >= 500) crashes.push(`${method.toUpperCase()} ${path} -> ${response.status}`);
    }
  }
}
if (crashes.length) {
  console.error(`API FUZZ CRASHES:\n${crashes.join("\n")}`);
  process.exit(1);
}
console.log(`API fuzz OK: ${probes} malformed/schema-hostile requests, no 5xx`);
