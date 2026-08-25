#!/usr/bin/env node
// Statically composes services/*/openapi.yaml into one aggregate document with
// gateway-facing path prefixes (/api/v1/...) — the same composition the gateway
// serves at runtime (services/gateway/internal/docs.go). The frontend builds
// never need a live mesh (PLAN item 37).
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "js-yaml";

const root = fileURLToPath(new URL("..", import.meta.url));
const servicesDir = join(root, "services");

const merged = {
  openapi: "3.0.3",
  info: { title: "platform aggregate API", version: "0.1.0" },
  servers: [{ url: "/" }],
  paths: {},
  components: { schemas: {} },
};

for (const svc of readdirSync(servicesDir)) {
  const specPath = join(servicesDir, svc, "openapi.yaml");
  let raw;
  try {
    raw = readFileSync(specPath, "utf8");
  } catch {
    continue;
  }
  const doc = YAML.load(raw);
  for (const [p, op] of Object.entries(doc.paths ?? {})) {
    merged.paths[`/api/v1${p}`] = op;
  }
  for (const [name, schema] of Object.entries(doc.components?.schemas ?? {})) {
    if (!(name in merged.components.schemas)) merged.components.schemas[name] = schema;
  }
}

const outDir = join(root, "packages", "contracts", "gen");
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "openapi.json"), JSON.stringify(merged, null, 2));
console.log(`composed ${Object.keys(merged.paths).length} paths -> packages/contracts/gen/openapi.json`);
