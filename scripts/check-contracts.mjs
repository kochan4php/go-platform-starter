#!/usr/bin/env node
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const spec = JSON.parse(readFileSync(join(root, "packages/contracts/gen/openapi.json"), "utf8"));
const generated = readFileSync(join(root, "packages/contracts/src/gen.d.ts"), "utf8");
const contractPackage = JSON.parse(readFileSync(join(root, "packages/contracts/package.json"), "utf8"));
const clientSource = readFileSync(join(root, "packages/contracts/src/index.ts"), "utf8");
const errorSource = readFileSync(join(root, "internal/platform/errors.go"), "utf8");
const calls = [];
const methods = ["get", "head", "post", "put", "patch", "delete"];

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

const operationIds = new Set();
for (const [path, pathItem] of Object.entries(spec.paths ?? {})) {
  for (const method of methods) {
    const operation = pathItem[method];
    if (!operation) continue;
    const label = `${method.toUpperCase()} ${path}`;
    if (!operation.operationId) failures.push(`${label}: missing operationId`);
    else if (operationIds.has(operation.operationId))
      failures.push(`${label}: duplicate operationId ${operation.operationId}`);
    else operationIds.add(operation.operationId);
    if (!operation.description) failures.push(`${label}: missing description`);
    if (!operation.tags?.length) failures.push(`${label}: missing tags`);
    if (typeof operation.deprecated !== "boolean") failures.push(`${label}: deprecated must be explicit`);
    if (path.startsWith("/api/v1") && operation.responses?.default?.$ref !== "#/components/responses/Error")
      failures.push(`${label}: missing standard error response`);
    for (const [status, response] of Object.entries(operation.responses ?? {})) {
      if (response.$ref) continue;
      if (!response.description) failures.push(`${label} ${status}: missing response description`);
      for (const [contentType, media] of Object.entries(response.content ?? {})) {
        if (media.example === undefined && !media.examples)
          failures.push(`${label} ${status} ${contentType}: missing example`);
      }
    }
    for (const [contentType, media] of Object.entries(operation.requestBody?.content ?? {})) {
      if (media.example === undefined && !media.examples)
        failures.push(`${label} request ${contentType}: missing example`);
    }
    if (
      path.startsWith("/api/v1") &&
      method === "post" &&
      !operation.parameters?.some((item) => item.$ref === "#/components/parameters/IdempotencyKey")
    )
      failures.push(`${label}: missing Idempotency-Key`);
    if (
      /^list[A-Z]/.test(operation.operationId ?? "") &&
      !JSON.stringify(operation.responses?.["200"] ?? {}).includes("EnvelopeMeta")
    )
      failures.push(`${label}: list response must use EnvelopeMeta`);
  }
}

for (const required of ["BulkResult", "AsyncOperation", "EnvelopeMeta", "ErrorCode", "EventEnvelope"]) {
  if (!spec.components?.schemas?.[required]) failures.push(`missing shared schema ${required}`);
}
for (const required of ["bearerAuth", "refreshCookie", "internalSecret"]) {
  if (!spec.components?.securitySchemes?.[required]) failures.push(`missing security scheme ${required}`);
}
if (spec.openapi !== "3.1.0" || !Object.keys(spec.webhooks ?? {}).length)
  failures.push("OpenAPI 3.1 webhooks missing");
if ((spec.servers ?? []).length < 3) failures.push("development/staging/production servers missing");
if (!spec.paths?.["/api/v1/auth/register"]?.post?.responses?.["201"]?.links)
  failures.push("cross-operation link missing");
if (spec.info?.version !== contractPackage.version) failures.push("aggregate and SDK versions differ");
if (clientSource.includes("as unknown as ApiClient")) failures.push("ApiClient still uses an unsafe cast");

const goCodes = [...errorSource.matchAll(/Error[A-Za-z]+\s+=\s+"([a-z_]+)"/g)]
  .map((match) => match[1])
  .sort();
const specCodes = [...(spec.components?.schemas?.ErrorCode?.enum ?? [])].sort();
if (JSON.stringify(goCodes) !== JSON.stringify(specCodes))
  failures.push("central Go and OpenAPI error code enums differ");

if (failures.length) {
  console.error(
    `CONTRACT DRIFT (${failures.length}):\n${failures.map((failure) => `  ${failure}`).join("\n")}`,
  );
  process.exit(1);
}
console.log(
  `contracts OK: ${calls.length} frontend calls, ${Object.keys(spec.paths).length} OpenAPI paths, ${operationIds.size} operations`,
);
