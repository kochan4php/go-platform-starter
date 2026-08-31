#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "js-yaml";

const root = fileURLToPath(new URL("..", import.meta.url));
const check = process.argv.includes("--check");
const generated = [];

function walk(directory, predicate) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory() && entry.name !== "node_modules" && entry.name !== "graphify-out")
      return walk(path, predicate);
    return entry.isFile() && predicate(path) ? [path] : [];
  });
}

function output(path, content) {
  const normalized = `${content.trimEnd()}\n`;
  if (check) {
    if (!existsSync(path) || readFileSync(path, "utf8") !== normalized) generated.push(relative(root, path));
    return;
  }
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, normalized);
}

const composeFiles = [
  ...walk(join(root, "infra"), (path) => /compose[^\\/]*\.ya?ml$/.test(path)),
  ...walk(join(root, "services"), (path) => path.endsWith("docker-compose.yml")),
  ...walk(join(root, "apps"), (path) => path.endsWith("docker-compose.yml")),
].sort();

function publishedPort(value) {
  if (typeof value === "object") {
    return { host: String(value.published ?? "dynamic"), container: String(value.target ?? "") };
  }
  const raw = String(value).replace(/^\d+\.\d+\.\d+\.\d+:/, "");
  const variable = raw.match(/^\$\{[^}]+:-([^}]+)\}:(\d+)(?:\/[a-z]+)?$/i);
  if (variable) return { host: variable[1], container: variable[2] };
  const parts = raw.split(":");
  const host = parts.length > 1 ? parts.at(-2) : "dynamic";
  return {
    host: host.replace(/^\$\{[^:}]+:-([^}]+)\}$/, "$1"),
    container: parts.at(-1).split("/")[0],
  };
}

const ports = [];
for (const file of composeFiles) {
  const document = YAML.load(readFileSync(file, "utf8"));
  for (const [service, config] of Object.entries(document?.services ?? {})) {
    for (const value of config?.ports ?? []) {
      const port = publishedPort(value);
      ports.push({
        stack: relative(root, file).replaceAll("\\", "/"),
        service,
        ...port,
      });
    }
  }
}

output(
  join(root, "docs", "reference", "PORTS.md"),
  `# Published ports

Generated from Compose manifests by \`node scripts/generate-docs.mjs\`. Internal-only
ports are intentionally absent. Override variables remain documented in the environment reference.

| Stack | Service | Host default | Container |
| --- | --- | ---: | ---: |
${ports.map((row) => `| \`${row.stack}\` | \`${row.service}\` | \`${row.host}\` | \`${row.container}\` |`).join("\n")}`,
);

const sensitive = /(password|secret|token|private|credential|dsn|key$)/i;
const variables = new Map();
function remember(name, source, value = "", required = false, description = "") {
  const row = variables.get(name) ?? {
    sources: new Set(),
    values: new Set(),
    required: false,
    descriptions: new Set(),
  };
  row.sources.add(source);
  if (value) row.values.add(sensitive.test(name) ? "<secret>" : value);
  if (description) row.descriptions.add(description);
  row.required ||= required;
  variables.set(name, row);
}

const envFiles = [
  ...walk(join(root, "infra"), (path) =>
    /(?:^|\.)env(?:\.[^.]+)?\.example$/.test(path.replaceAll("\\", "/").split("/").at(-1)),
  ),
  ...walk(join(root, "services"), (path) => path.endsWith(".env.example")),
  ...walk(join(root, "apps"), (path) => path.endsWith(".env.example")),
  join(root, "infra", "go.env"),
].filter(existsSync);

for (const file of envFiles.sort()) {
  let comments = [];
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    if (line.trim().startsWith("#")) {
      comments.push(line.replace(/^\s*#\s?/, "").trim());
      continue;
    }
    const match = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
    if (match)
      remember(
        match[1],
        relative(root, file).replaceAll("\\", "/"),
        match[2],
        match[2] === "",
        comments.join(" "),
      );
    comments = [];
  }
}

for (const file of composeFiles) {
  const source = relative(root, file).replaceAll("\\", "/");
  for (const match of readFileSync(file, "utf8").matchAll(/\$\{([A-Z][A-Z0-9_]*)(?:(:-|:\?)([^}]*))?\}/g)) {
    remember(
      match[1],
      source,
      match[2] === ":-" ? match[3] : "",
      match[2] === ":?",
      match[2] === ":?" ? match[3] : "",
    );
  }
}

const envRows = [...variables].sort(([a], [b]) => a.localeCompare(b));
output(
  join(root, "docs", "reference", "ENVIRONMENT.md"),
  `# Environment variable reference

Generated from committed \`.env.example\`, \`infra/go.env\`, and Compose interpolation.
Secret examples are always masked; the real values must come from the deployment secret store.

| Variable | Required | Default/example | Sources | Description |
| --- | :---: | --- | --- | --- |
${envRows
  .map(([name, row]) => {
    const values = [...row.values].join(" / ") || "—";
    const sources = [...row.sources].map((value) => `\`${value}\``).join("<br>");
    const description = [...row.descriptions].join(" ").replaceAll("|", "\\|") || "—";
    return `| \`${name}\` | ${row.required ? "yes" : "no"} | \`${values.replaceAll("|", "\\|")}\` | ${sources} | ${description} |`;
  })
  .join("\n")}`,
);

const spec = JSON.parse(readFileSync(join(root, "packages", "contracts", "gen", "openapi.json"), "utf8"));
const methods = ["get", "head", "post", "put", "patch", "delete"];
const byTag = new Map();
for (const [path, item] of Object.entries(spec.paths ?? {})) {
  for (const method of methods) {
    const operation = item[method];
    if (!operation) continue;
    const tag = operation.tags?.[0] ?? "other";
    if (!byTag.has(tag)) byTag.set(tag, []);
    const allParameters = [...(item.parameters ?? []), ...(operation.parameters ?? [])];
    let url = path.replace(/\{[^}]+\}/g, "1");
    const requiredQuery = allParameters.filter((parameter) => parameter.in === "query" && parameter.required);
    if (requiredQuery.length) {
      const query = requiredQuery.map(
        (parameter) => `${parameter.name}=${parameter.example ?? parameter.schema?.default ?? "example"}`,
      );
      url += `?${query.join("&")}`;
    }
    const lines = [
      `curl --fail-with-body --request ${method.toUpperCase()}`,
      `  'http://127.0.0.1:8010${url}'`,
    ];
    if (operation.security?.some((entry) => entry.bearerAuth))
      lines.push("  --header 'Authorization: Bearer <access-token>'");
    if (method === "post") lines.push("  --header 'Idempotency-Key: <unique-request-id>'");
    const content = operation.requestBody?.content ?? {};
    if (content["multipart/form-data"]) lines.push("  --form 'file=@avatar.jpg'");
    else if (content["application/json"]) {
      lines.push("  --header 'Content-Type: application/json'");
      lines.push(`  --data '${JSON.stringify(content["application/json"].example ?? {})}'`);
    }
    const command = lines.join(" \\" + "\n");
    byTag
      .get(tag)
      .push(
        `### ${operation.operationId}\n\n${operation.summary ?? `${method.toUpperCase()} ${path}`}\n\n\`\`\`sh\n${command}\n\`\`\``,
      );
  }
}

output(
  join(root, "docs", "API_EXAMPLES.md"),
  `# API curl examples

Generated from the aggregate OpenAPI document. Replace placeholders before use; the lab gateway defaults to \`127.0.0.1:8010\`.

${[...byTag]
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([tag, examples]) => `## ${tag}\n\n${examples.join("\n\n")}`)
  .join("\n\n")}`,
);

function classifyLicense(directory) {
  if (!directory || !existsSync(directory)) return "Unknown";
  const license = readdirSync(directory).find((name) => /^(license|copying)(\.|$)/i.test(name));
  if (!license) return "Unknown";
  const text = readFileSync(join(directory, license), "utf8").toLowerCase();
  if (text.includes("apache license") && text.includes("version 2.0")) return "Apache-2.0";
  if (text.includes("mozilla public license") && text.includes("2.0")) return "MPL-2.0";
  if (text.includes("isc license")) return "ISC";
  if (text.includes("permission is hereby granted")) return "MIT";
  if (text.includes("redistribution and use in source and binary forms"))
    return text.includes("neither the name") ? "BSD-3-Clause" : "BSD-2-Clause";
  return "See upstream LICENSE";
}

const directGo = new Set(
  readFileSync(join(root, "go.mod"), "utf8")
    .match(/require \(\r?\n([\s\S]*?)\r?\n\)/)?.[1]
    ?.split(/\r?\n/)
    .map((line) => line.trim().split(/\s+/)[0])
    .filter(Boolean) ?? [],
);
const goModules = new Map();
try {
  const listing = execFileSync(
    "go",
    ["list", "-m", "-f", "{{if not .Main}}{{.Path}}\t{{.Version}}\t{{.Dir}}{{end}}", "all"],
    {
      cwd: root,
      encoding: "utf8",
    },
  );
  for (const line of listing.split(/\r?\n/).filter(Boolean)) {
    const [name, version, directory] = line.split("\t");
    if (directGo.has(name)) goModules.set(name, { version, license: classifyLicense(directory) });
  }
} catch {
  // A fresh offline checkout may lack the module cache; --check will surface drift once dependencies are available.
}

const packageFiles = [
  join(root, "package.json"),
  ...walk(join(root, "apps"), (path) => path.endsWith("package.json")),
  ...walk(join(root, "packages"), (path) => path.endsWith("package.json")),
];
const nodePackages = new Map();
for (const manifest of packageFiles) {
  const data = JSON.parse(readFileSync(manifest, "utf8"));
  for (const [name, range] of Object.entries({ ...data.dependencies, ...data.devDependencies })) {
    if (name.startsWith("@starter/")) continue;
    const candidates = [
      join(dirname(manifest), "node_modules", name, "package.json"),
      join(root, "node_modules", name, "package.json"),
    ];
    const installed = candidates.find(existsSync);
    const metadata = installed ? JSON.parse(readFileSync(installed, "utf8")) : {};
    const license = typeof metadata.license === "string" ? metadata.license : "Unknown";
    nodePackages.set(name, { version: metadata.version ?? range, license });
  }
}

output(
  join(root, "docs", "DEPENDENCY_LICENSES.md"),
  `# Direct dependency licenses

Generated from \`go.mod\`, workspace manifests, installed package metadata, and upstream license files.
This is an engineering inventory, not legal advice; release artifacts still require SBOM and license-policy checks.

## Go modules

| Module | Version | Detected license |
| --- | --- | --- |
${[...goModules]
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([name, item]) => `| \`${name}\` | \`${item.version}\` | ${item.license} |`)
  .join("\n")}

## JavaScript packages

| Package | Installed/version range | Declared license |
| --- | --- | --- |
${[...nodePackages]
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([name, item]) => `| \`${name}\` | \`${item.version}\` | ${item.license} |`)
  .join("\n")}`,
);

if (check && generated.length) {
  console.error(`generated docs are stale: ${generated.join(", ")}`);
  process.exit(1);
}
console.log(check ? "generated docs are fresh" : "generated docs updated");
