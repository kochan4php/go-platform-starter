import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

test("contract drift gate accepts the committed frontend/OpenAPI surface", () => {
  const output = execFileSync(process.execPath, ["scripts/check-contracts.mjs"], { encoding: "utf8" });
  assert.match(output, /contracts OK/);
});

test("bundle budget gate fails for an oversized artifact", (t) => {
  const tmp = mkdtempSync(join(tmpdir(), "starter-budget-"));
  t.after(() => rmSync(tmp, { recursive: true, force: true }));
  mkdirSync(join(tmp, "assets"), { recursive: true });
  writeFileSync(join(tmp, "assets", "oversized.js"), "x".repeat(2048));
  writeFileSync(join(tmp, "budget.json"), JSON.stringify({ totalJsKb: 1 }));
  assert.throws(() =>
    execFileSync(process.execPath, ["scripts/check-budget.mjs"], {
      env: { ...process.env, BUDGET_DIST: join(tmp, "assets"), BUDGET_FILE: join(tmp, "budget.json") },
      stdio: "pipe",
    }),
  );
});

test("import-boundary gate catches a cross-app import", (t) => {
  const tmp = mkdtempSync(join(tmpdir(), "starter-deps-"));
  t.after(() => rmSync(tmp, { recursive: true, force: true }));
  mkdirSync(join(tmp, "apps", "one", "src"), { recursive: true });
  mkdirSync(join(tmp, "apps", "two", "src"), { recursive: true });
  mkdirSync(join(tmp, "packages"), { recursive: true });
  writeFileSync(
    join(tmp, "apps", "one", "src", "index.ts"),
    `import { value } from "../../two/src/index";\nvoid value;\n`,
  );
  writeFileSync(join(tmp, "apps", "two", "src", "index.ts"), "export const value = 1;\n");
  assert.throws(() =>
    execFileSync(process.execPath, ["scripts/check-deps.mjs"], {
      env: { ...process.env, CHECK_DEPS_ROOT: tmp },
      stdio: "pipe",
    }),
  );
});
