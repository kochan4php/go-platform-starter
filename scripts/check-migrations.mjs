import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { relative, resolve } from "node:path";

const root = resolve(process.env.MIGRATION_ROOT || ".");
const manifestPath = resolve(root, "migrations/checksums.sha256");

function migrationFiles() {
  const services = resolve(root, "services");
  if (!existsSync(services)) return [];
  return readdirSync(services, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((entry) => {
      const directory = resolve(services, entry.name, "migrations");
      return existsSync(directory)
        ? readdirSync(directory)
            .filter((name) => /^\d{6}_[a-z0-9_]+\.(up|down)\.sql$/.test(name))
            .map((name) => resolve(directory, name))
        : [];
    })
    .sort();
}

function pathOf(file) {
  return relative(root, file).replaceAll("\\", "/");
}

function digest(file) {
  return createHash("sha256").update(readFileSync(file)).digest("hex");
}

function fail(errors) {
  if (errors.length === 0) return;
  for (const error of errors) console.error(`migration check: ${error}`);
  process.exit(1);
}

function lint(files) {
  const errors = [];
  const pairs = new Map();
  const destructive = [
    /\bDROP\s+(?:TABLE|SCHEMA|TYPE|FUNCTION|TRIGGER)\s+(?!IF\s+EXISTS)/gi,
    /\bDROP\s+INDEX\s+(?!(?:CONCURRENTLY\s+)?IF\s+EXISTS)/gi,
    /\bDROP\s+COLUMN\s+(?!IF\s+EXISTS)/gi,
    /\bDROP\s+CONSTRAINT\s+(?!IF\s+EXISTS)/gi,
  ];
  for (const file of files) {
    const path = pathOf(file);
    const match = path.match(/^(services\/[^/]+\/migrations\/(\d{6})_[^.]+)\.(up|down)\.sql$/);
    if (!match) continue;
    const pair = pairs.get(match[1]) || new Set();
    pair.add(match[3]);
    pairs.set(match[1], pair);
    const sql = readFileSync(file, "utf8");
    for (const pattern of destructive) {
      if (pattern.test(sql)) errors.push(`${path}: destructive DROP must use IF EXISTS`);
      pattern.lastIndex = 0;
    }
    const noTransaction = /no-transaction:/i.test(sql);
    if (match[3] === "up" && match[2] !== "000001" && !noTransaction) {
      if (!/\bSET\s+lock_timeout\s*=/i.test(sql)) errors.push(`${path}: SET lock_timeout is required`);
      if (!/\bSET\s+statement_timeout\s*=/i.test(sql))
        errors.push(`${path}: SET statement_timeout is required`);
    }
    if (/\b(?:CREATE|DROP)\s+(?:UNIQUE\s+)?INDEX\s+CONCURRENTLY/i.test(sql) && !noTransaction) {
      errors.push(`${path}: concurrent index migrations need a no-transaction marker`);
    }
    if (noTransaction && (sql.match(/;/g) || []).length !== 1) {
      errors.push(`${path}: no-transaction migration must contain exactly one SQL statement`);
    }
    if (/\b(?:VARCHAR|TIMESTAMP\s+WITHOUT\s+TIME\s+ZONE)\b/i.test(sql)) {
      errors.push(`${path}: use TEXT and TIMESTAMPTZ consistently`);
    }
  }
  for (const [pair, directions] of pairs) {
    if (!directions.has("up") || !directions.has("down")) errors.push(`${pair}: missing up/down pair`);
  }
  fail(errors);
  console.log(`migration lint OK (${files.length / 2} reversible pairs)`);
}

function snapshot(files) {
  const output = `${files.map((file) => `${digest(file)}  ${pathOf(file)}`).join("\n")}\n`;
  mkdirSync(resolve(root, "migrations"), { recursive: true });
  writeFileSync(manifestPath, output);
  console.log(`migration checksums written (${files.length} files)`);
}

function verify(files) {
  if (!existsSync(manifestPath)) fail(["migrations/checksums.sha256 is missing"]);
  const expected = new Map(
    readFileSync(manifestPath, "utf8")
      .trim()
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => [line.slice(66), line.slice(0, 64)]),
  );
  const errors = [];
  for (const file of files) {
    const path = pathOf(file);
    if (!expected.has(path)) errors.push(`${path}: checksum is not registered`);
    else if (expected.get(path) !== digest(file))
      errors.push(`${path}: checksum mismatch; applied migrations are immutable`);
    expected.delete(path);
  }
  for (const path of expected.keys()) errors.push(`${path}: registered migration is missing`);
  fail(errors);
  console.log(`migration checksums OK (${files.length} files)`);
}

function protect(base) {
  if (!base) return;
  try {
    execFileSync(
      "git",
      [
        "-c",
        `safe.directory=${root.replaceAll("\\", "/")}`,
        "cat-file",
        "-e",
        `${base}:migrations/checksums.sha256`,
      ],
      { stdio: "ignore" },
    );
  } catch {
    console.log(
      `migration checksum baseline introduced after ${base}; immutable-history comparison starts with this snapshot`,
    );
    return;
  }
  const errors = [];
  for (const file of migrationFiles()) {
    const path = pathOf(file);
    try {
      const previous = execFileSync("git", [
        "-c",
        `safe.directory=${root.replaceAll("\\", "/")}`,
        "show",
        `${base}:${path}`,
      ]);
      const previousHash = createHash("sha256").update(previous).digest("hex");
      if (previousHash !== digest(file))
        errors.push(`${path}: existing migration changed relative to ${base}`);
    } catch {
      // A path absent at the base is a new migration and is allowed.
    }
  }
  fail(errors);
  console.log(`migration history immutable relative to ${base}`);
}

const files = migrationFiles();
const [command = "check", argument] = process.argv.slice(2);
if (command === "snapshot") snapshot(files);
else if (command === "lint") lint(files);
else if (command === "verify") verify(files);
else if (command === "protect") protect(argument);
else if (command === "check") {
  lint(files);
  verify(files);
  protect(argument);
} else fail([`unknown command ${command}`]);
