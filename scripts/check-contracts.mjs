#!/usr/bin/env node
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const spec = JSON.parse(readFileSync(join(root, "packages/contracts/gen/openapi.json"), "utf8"));
const generated = readFileSync(join(root, "packages/contracts/src/gen.d.ts"), "utf8");
const calls = [];

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const stat = statSync(path);
    if (stat.isDirectory()) yield* walk(path);
    else if (/\.(ts|tsx)$/.test(name) && !name.endsWith(".test.ts") && !name.endsWith(".test.tsx"))
      yield path;
  }
}

for (const workspace of readdirSync(join(root, "apps"))) {
  const src = join(root, "apps", workspace, "src");
  try {
    for (const file of walk(src)) {
      const text = readFileSync(file, "utf8");
      for (const match of text.matchAll(/api\.(GET|POST|PUT|PATCH|DELETE)\(\s*["'`]([^"'`]+)["'`]/g)) {
        calls.push({ method: match[1].toLowerCase(), path: match[2], file: relative(root, file) });
      }
    }
  } catch {
    // Workspace without src is outside the browser contract surface.
  }
}

const failures = [];
for (const call of calls) {
  if (!spec.paths?.[call.path]?.[call.method])
    failures.push(`${call.file}: ${call.method.toUpperCase()} ${call.path}`);
}
for (const path of Object.keys(spec.paths ?? {})) {
  if (!generated.includes(`"${path}"`)) failures.push(`generated types missing ${path}`);
}
if (failures.length) {
  console.error(
    `CONTRACT DRIFT (${failures.length}):\n${failures.map((failure) => `  ${failure}`).join("\n")}`,
  );
  process.exit(1);
}
console.log(`contracts OK: ${calls.length} frontend calls, ${Object.keys(spec.paths).length} OpenAPI paths`);
