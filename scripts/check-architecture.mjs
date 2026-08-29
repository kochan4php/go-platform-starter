import { readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";

const root = new URL("..", import.meta.url).pathname.replace(/^\/(.:)/, "$1");
const servicesRoot = join(root, "services");
const violations = [];

function files(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}

for (const file of files(servicesRoot).filter(
  (path) => extname(path) === ".go" && !path.includes("\\gen\\"),
)) {
  const source = readFileSync(file, "utf8");
  const owner = relative(servicesRoot, file).split(/[\\/]/)[0];
  for (const match of source.matchAll(
    /github\.com\/kochan4php\/go-platform-starter\/services\/([^/"\s]+)/g,
  )) {
    if (match[1] !== owner) violations.push(`${relative(root, file)} imports service ${match[1]}`);
  }
}

for (const service of readdirSync(servicesRoot, { withFileTypes: true }).filter((entry) =>
  entry.isDirectory(),
)) {
  const migrationDir = join(servicesRoot, service.name, "migrations");
  try {
    for (const file of readdirSync(migrationDir).filter((name) => name.endsWith(".up.sql"))) {
      const sql = readFileSync(join(migrationDir, file), "utf8");
      for (const match of sql.matchAll(/CREATE\s+SCHEMA\s+(?:IF NOT EXISTS\s+)?([a-z_]+)/gi)) {
        if (match[1] !== service.name && !(service.name === "worker" && match[1] === "audit")) {
          violations.push(`${service.name}/migrations/${file} creates schema ${match[1]}`);
        }
      }
      for (const match of sql.matchAll(
        /CREATE\s+(?:TABLE|MATERIALIZED VIEW)\s+(?:IF NOT EXISTS\s+)?([a-z_]+)\./gi,
      )) {
        if (match[1] !== service.name && !(service.name === "worker" && match[1] === "audit")) {
          violations.push(`${service.name}/migrations/${file} creates schema-owned object ${match[1]}`);
        }
      }
    }
  } catch {
    // Infrastructure-only services legitimately have no migrations.
  }
}

if (violations.length) {
  console.error(
    `architecture fitness functions failed:\n${violations.map((item) => `- ${item}`).join("\n")}`,
  );
  process.exit(1);
}
console.log("architecture fitness functions passed");
