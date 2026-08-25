#!/usr/bin/env node
// Workspace import-boundary check (PLAN item 80), the web-side twin of the Go
// depguard bans:
//   1. apps/<a>/src must not import from a different apps/<b>
//   2. packages/*/src must not import from apps/*
//   3. browser code (apps src) must not import node builtins
// Federation is the only sanctioned cross-app boundary — never an import.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve, dirname, posix } from "node:path";
import { fileURLToPath } from "node:url";
import { builtinModules } from "node:module";

const root = fileURLToPath(new URL("..", import.meta.url));
const exts = [".ts", ".tsx", ".mjs", ".js"];
const nodeBuiltins = new Set(builtinModules);

function* walk(dir) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (e === "node_modules" || e === "dist" || e === "gen") continue;
    const st = statSync(p);
    if (st.isDirectory()) yield* walk(p);
    else if (exts.some((x) => e.endsWith(x)) && !e.endsWith(".d.ts")) yield p;
  }
}

const specRe = /(?:from\s+|import\s*\(\s*)["']([^"']+)["']/g;
const violations = [];

for (const ws of ["apps", "packages"]) {
  const wsDir = join(root, ws);
  for (const unit of readdirSync(wsDir)) {
    const unitDir = join(wsDir, unit);
    if (!statSync(unitDir).isDirectory()) continue;
    for (const file of walk(join(unitDir, "src"))) {
      const src = readFileSync(file, "utf8");
      for (const [, spec] of src.matchAll(specRe)) {
        if (nodeBuiltins.has(spec) && ws === "apps") {
          violations.push(`${relative(root, file)}: node builtin "${spec}"`);
          continue;
        }
        if (spec.startsWith(".")) {
          const resolved = posix.normalize(
            relative(root, resolve(dirname(file), spec)).replaceAll("\\", "/"),
          );
          const inUnit = resolved.startsWith(posix.join(ws, unit, "src"));
          const otherApp = resolved.match(/^apps\/([^/]+)\//);
          if (!inUnit && otherApp && otherApp[1] !== unit) {
            violations.push(
              `${relative(root, file)}: imports across workspace boundary -> ${resolved}`,
            );
          }
          if (ws === "packages" && resolved.startsWith("apps/")) {
            violations.push(`${relative(root, file)}: packages must not import apps -> ${resolved}`);
          }
        }
      }
    }
  }
}

if (violations.length) {
  console.error("IMPORT BOUNDARY VIOLATIONS:");
  for (const v of violations) console.error("  " + v);
  process.exit(1);
}
console.log("import boundaries OK (apps/* + packages/* scanned)");
