#!/usr/bin/env node
import { execFileSync, spawn, spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  watch,
  writeFileSync,
} from "node:fs";
import { basename, extname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import YAML from "js-yaml";

export const root = fileURLToPath(new URL("..", import.meta.url));
const compose = ["compose", "-p", "go-platform-lab", "-f", "compose.base.yml", "-f", "compose.lab.yml"];

function fail(message) {
  throw new Error(message);
}

export function validName(value) {
  return /^[a-z][a-z0-9-]{0,30}$/.test(value ?? "");
}

export function migrationNumber(names) {
  const latest = names.reduce((max, name) => Math.max(max, Number(name.match(/^(\d+)_/)?.[1] ?? 0)), 0);
  return String(latest + 1).padStart(6, "0");
}

export function fakeUsers(count = 20) {
  return Array.from({ length: count }, (_, index) => {
    const id = index + 1;
    return {
      email: `developer${String(id).padStart(2, "0")}@example.local`,
      displayName: `Developer ${String(id).padStart(2, "0")}`,
      password: "Local-development-2026!",
      role: ["user", "operator", "auditor", "support"][index % 4],
    };
  });
}

function ensureService(service) {
  const directory = join(root, "services", service ?? "");
  if (
    !validName(service) ||
    service === "_template" ||
    !existsSync(directory) ||
    !statSync(directory).isDirectory()
  )
    fail(`unknown service: ${service || "<empty>"}`);
  return service;
}

function run(command, args, options = {}) {
  return execFileSync(command, args, { cwd: root, stdio: "inherit", ...options });
}

function docker(args, options = {}) {
  return execFileSync("docker", [...compose, ...args], {
    cwd: join(root, "infra"),
    stdio: "inherit",
    ...options,
  });
}

function openURL(url) {
  if (process.platform === "win32")
    spawn("cmd.exe", ["/d", "/s", "/c", "start", "", url], { detached: true });
  else if (process.platform === "darwin") spawn("open", [url], { detached: true });
  else spawn("xdg-open", [url], { detached: true });
}

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

export function newService(name) {
  if (!validName(name)) fail("service name must be lowercase kebab-case");
  const target = join(root, "services", name);
  if (existsSync(target)) fail(`services/${name} already exists`);
  cpSync(join(root, "services", "_template"), target, { recursive: true });
  for (const path of walk(target)) {
    if (
      ![".go", ".yaml", ".yml", ".toml", ".json", ".md", ".example"].includes(extname(path)) &&
      !["Dockerfile", "Jenkinsfile"].includes(basename(path))
    )
      continue;
    const content = readFileSync(path, "utf8").replaceAll("_template", name);
    writeFileSync(path, content);
  }
  console.log(
    `created services/${name} (OpenAPI, handler, migration, Air, Docker, Kubernetes, and e2e stub)`,
  );
}

export function newMigration(service, rawName) {
  ensureService(service);
  const name = rawName?.replaceAll("-", "_");
  if (!/^[a-z][a-z0-9_]{0,60}$/.test(name ?? "")) fail("migration name must be lowercase snake_case");
  const directory = join(root, "services", service, "migrations");
  if (!existsSync(directory)) fail(`services/${service} does not own migrations`);
  const number = migrationNumber(readdirSync(directory));
  const header = `SET lock_timeout = '5s';\nSET statement_timeout = '5min';\n\n-- ${name}\n`;
  for (const direction of ["up", "down"]) {
    writeFileSync(join(directory, `${number}_${name}.${direction}.sql`), header);
  }
  console.log(`created ${service} migration ${number}_${name}.{up,down}.sql`);
}

function operationName(value) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .toLowerCase();
}

export function handlerSignature(source, operationID) {
  const match = source.match(new RegExp(`^[\\t ]*${operationID}\\(([^\\r\\n]*)\\)\\r?$`, "m"));
  if (!match) fail(`generated ServerInterface method ${operationID} is absent`);
  return match[1].replace(/(?<![.\w])([A-Z][a-zA-Z0-9_]*)/g, "gen.$1");
}

export function newHandler(service, operationID) {
  ensureService(service);
  if (!/^[a-zA-Z][a-zA-Z0-9]{1,80}$/.test(operationID ?? "")) fail("operationId is invalid");
  const spec = YAML.load(readFileSync(join(root, "services", service, "openapi.yaml"), "utf8"));
  const operations = Object.values(spec.paths ?? {}).flatMap((path) => Object.values(path ?? {}));
  if (!operations.some((operation) => operation?.operationId === operationID)) {
    fail(`operationId ${operationID} is absent from services/${service}/openapi.yaml`);
  }
  const method = `${operationID[0].toUpperCase()}${operationID.slice(1)}`;
  const implemented = walk(join(root, "services", service, "internal")).some(
    (path) =>
      path.endsWith(".go") &&
      new RegExp(`func\\s*\\([^)]*\\*Handlers\\)\\s*${method}\\s*\\(`).test(readFileSync(path, "utf8")),
  );
  if (implemented) fail(`${method} is already implemented by Handlers`);
  const signature = handlerSignature(
    readFileSync(join(root, "services", service, "gen", "gen.go"), "utf8"),
    method,
  );
  const file = join(root, "services", service, "internal", `${operationName(method)}_handler.go`);
  if (existsSync(file)) fail(`${relative(root, file)} already exists`);
  const genImport = signature.includes("gen.")
    ? `\n\tgen "github.com/kochan4php/go-platform-starter/services/${service}/gen"`
    : "";
  writeFileSync(
    file,
    `package internal\n\nimport (\n\t"net/http"${genImport}\n)\n\n// ${method} implements the generated OpenAPI operation ${operationID}.\nfunc (_ *Handlers) ${method}(${signature}) {\n\thttp.Error(w, "not implemented", http.StatusNotImplemented)\n}\n`,
  );
  run("gofmt", ["-w", file]);
  console.log(`created ${relative(root, file)}`);
}

async function seed() {
  const base = (process.env.DEV_GATEWAY_URL ?? "http://127.0.0.1:8010").replace(/\/$/, "");
  for (const user of fakeUsers()) {
    const response = await fetch(`${base}/api/v1/auth/register`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(user),
    });
    if (!response.ok && response.status !== 409) fail(`seed ${user.email}: HTTP ${response.status}`);
  }
  const sql = `
INSERT INTO rbac.roles (name, description, color, icon)
VALUES ('operator','operational demo role','#0f766e','wrench'),
       ('auditor','read-only audit demo role','#7c3aed','eye'),
       ('support','support demo role','#2563eb','lifebuoy')
ON CONFLICT (name) DO NOTHING;
DELETE FROM rbac.user_roles ur USING users.users u
WHERE ur.user_id = u.id AND u.email LIKE 'developer%@example.local';
INSERT INTO rbac.user_roles (user_id, role_id)
SELECT u.id, r.id FROM users.users u
JOIN rbac.roles r ON r.name = CASE (u.id % 4)
  WHEN 0 THEN 'support' WHEN 1 THEN 'user' WHEN 2 THEN 'operator' ELSE 'auditor' END
WHERE u.email LIKE 'developer%@example.local'
ON CONFLICT DO NOTHING;
INSERT INTO rbac.user_versions (user_id, ver)
SELECT id, 0 FROM users.users WHERE email LIKE 'developer%@example.local'
ON CONFLICT (user_id) DO NOTHING;`;
  docker(["exec", "-T", "postgres", "psql", "-v", "ON_ERROR_STOP=1", "-U", "app", "-d", "app", "-c", sql]);
  console.log("seeded 20 deterministic users across user/operator/auditor/support roles");
}

async function seedReset() {
  const sql = `DO $reset$ DECLARE names text; BEGIN
SELECT string_agg(format('%I.%I', schemaname, tablename), ', ')
INTO names FROM pg_tables WHERE schemaname IN ('auth','users','rbac','worker');
IF names IS NOT NULL THEN EXECUTE 'TRUNCATE TABLE ' || names || ' RESTART IDENTITY CASCADE'; END IF;
END $reset$;
INSERT INTO users.product_records (kind, owner_id, name, status, payload)
SELECT 'role_template', 0, seed.name, 'active', seed.payload::jsonb
FROM (VALUES
  ('Viewer', '{"source":"curated","permissions":["user:read:any","role:read:any"]}'),
  ('Operator', '{"source":"curated","permissions":["user:read:any","user:update:any","role:read:any"]}'),
  ('Auditor', '{"source":"curated","permissions":["audit:read:any","user:read:any"]}')
) AS seed(name, payload);`;
  docker(["exec", "-T", "postgres", "psql", "-v", "ON_ERROR_STOP=1", "-U", "app", "-d", "app", "-c", sql]);
  docker(["run", "--rm", "-T", "rbac", "-seed"]);
  docker(["run", "--rm", "-T", "auth", "-seed"]);
  await seed();
}

function dbShell(service) {
  ensureService(service);
  const schema = ["gateway", "realtime", "scheduler"].includes(service) ? "public" : service;
  docker([
    "exec",
    "-e",
    `PGOPTIONS=-c search_path=${schema},public`,
    "postgres",
    "psql",
    "-U",
    "app",
    "-d",
    "app",
  ]);
}

function redisCLI() {
  docker(["exec", "redis", "redis-cli"]);
}

function logs(service) {
  ensureService(service);
  docker(["logs", "--tail", process.env.LINES ?? "200", "-f", service]);
}

function printFakeData(count, format) {
  const rows = fakeUsers(Number(count) || 20);
  if (format === "csv") {
    console.log("email,displayName,password,role");
    for (const row of rows)
      console.log(
        [row.email, row.displayName, row.password, row.role].map((v) => JSON.stringify(v)).join(","),
      );
  } else console.log(JSON.stringify(rows, null, 2));
}

function testWatch() {
  let running = false;
  let rerun = false;
  const execute = () => {
    if (running) {
      rerun = true;
      return;
    }
    running = true;
    const child = spawn("go", ["test", "./..."], { cwd: root, stdio: "inherit" });
    child.on("exit", () => {
      running = false;
      if (rerun) {
        rerun = false;
        execute();
      }
    });
  };
  let timer;
  watch(root, { recursive: true }, (_event, file) => {
    if (!file?.endsWith(".go") || /(?:^|[\\/])(?:tmp|node_modules|graphify-out)(?:[\\/]|$)/.test(file))
      return;
    clearTimeout(timer);
    timer = setTimeout(execute, 250);
  });
  execute();
  console.log("watching Go files; Ctrl+C stops");
}

function delve(pid) {
  if (!/^\d+$/.test(pid ?? "")) fail("usage: devx delve <pid>");
  run("dlv", ["attach", pid]);
}

function localHTTPS() {
  const directory = join(root, "tmp", "certs");
  const cert = join(directory, "localhost.pem");
  const key = join(directory, "localhost-key.pem");
  mkdirSync(directory, { recursive: true });
  const probe = spawnSync("mkcert", ["-version"], { stdio: "ignore", shell: process.platform === "win32" });
  if (probe.status !== 0) fail("mkcert is required; see docs/DEVELOPER_EXPERIENCE.md#local-https");
  run("mkcert", ["-install"]);
  run("mkcert", ["-cert-file", cert, "-key-file", key, "127.0.0.1", "localhost", "::1"]);
  run("bash", ["scripts/dev-all.sh"], {
    env: {
      ...process.env,
      DEV_HTTPS: "1",
      DEV_HTTPS_CERT: cert,
      DEV_HTTPS_KEY: key,
      VITE_GATEWAY_URL: "https://127.0.0.1:5173",
      APP_PUBLIC_URL: "https://127.0.0.1:5173",
      COOKIE_SECURE: "true",
      TRUSTED_DOMAINS:
        "https://127.0.0.1:5173,https://127.0.0.1:5174,https://127.0.0.1:5175,https://127.0.0.1:5176",
    },
  });
}

function openDevelopment() {
  for (const url of ["http://127.0.0.1:5173", "http://127.0.0.1:8010/docs", "http://127.0.0.1:8010/healthz"])
    openURL(url);
}

const help = `Developer experience commands:
  open | open-docs | https | test-watch | delve [pid]
  seed | seed-reset | fake-data [count] [json|csv]
  new-service <name> | new-migration <service> <name> | new-handler <service> <operationId>
  db-shell <service> | psql | redis-cli | logs <service>`;

export async function main(argv = process.argv.slice(2)) {
  const [command, ...args] = argv;
  if (command === "new-service") newService(args[0]);
  else if (command === "new-migration") newMigration(args[0], args[1]);
  else if (command === "new-handler") newHandler(args[0], args[1]);
  else if (command === "seed") await seed();
  else if (command === "seed-reset") await seedReset();
  else if (command === "db-shell") dbShell(args[0]);
  else if (command === "psql") dbShell("users");
  else if (command === "redis-cli") redisCLI();
  else if (command === "logs") logs(args[0]);
  else if (command === "fake-data") printFakeData(args[0], args[1]);
  else if (command === "test-watch") testWatch();
  else if (command === "delve") delve(args[0]);
  else if (command === "https") localHTTPS();
  else if (command === "open") openDevelopment();
  else if (command === "open-docs") run(process.execPath, [join(root, "scripts", "open-docs.mjs"), ...args]);
  else console.log(help);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(`[devx] ${error.message}`);
    process.exitCode = 1;
  });
}
