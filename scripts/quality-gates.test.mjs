import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

test("documentation gate accepts generated references and local links", () => {
  execFileSync(process.execPath, ["scripts/generate-docs.mjs", "--check"], { stdio: "pipe" });
  const output = execFileSync(process.execPath, ["scripts/check-docs.mjs"], { encoding: "utf8" });
  assert.match(output, /docs OK/);
});

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

test("migration gate accepts paired, timeout-bounded migrations", (t) => {
  const tmp = mkdtempSync(join(tmpdir(), "starter-migrations-"));
  t.after(() => rmSync(tmp, { recursive: true, force: true }));
  const migrations = join(tmp, "services", "sample", "migrations");
  mkdirSync(migrations, { recursive: true });
  writeFileSync(
    join(migrations, "000002_safe.up.sql"),
    "SET lock_timeout = '5s'; SET statement_timeout = '5min'; CREATE TABLE sample.safe (id BIGINT);\n",
  );
  writeFileSync(join(migrations, "000002_safe.down.sql"), "DROP TABLE IF EXISTS sample.safe;\n");
  const output = execFileSync(process.execPath, ["scripts/check-migrations.mjs", "lint"], {
    cwd: process.cwd(),
    env: { ...process.env, MIGRATION_ROOT: tmp },
    encoding: "utf8",
  });
  assert.match(output, /migration lint OK/);
});

test("migration gate rejects destructive DROP without IF EXISTS", (t) => {
  const tmp = mkdtempSync(join(tmpdir(), "starter-migrations-"));
  t.after(() => rmSync(tmp, { recursive: true, force: true }));
  const migrations = join(tmp, "services", "sample", "migrations");
  mkdirSync(migrations, { recursive: true });
  writeFileSync(
    join(migrations, "000002_unsafe.up.sql"),
    "SET lock_timeout = '5s'; SET statement_timeout = '5min'; DROP TABLE sample.old;\n",
  );
  writeFileSync(join(migrations, "000002_unsafe.down.sql"), "DROP TABLE IF EXISTS sample.old;\n");
  assert.throws(() =>
    execFileSync(process.execPath, ["scripts/check-migrations.mjs", "lint"], {
      cwd: process.cwd(),
      env: { ...process.env, MIGRATION_ROOT: tmp },
      stdio: "pipe",
    }),
  );
});
