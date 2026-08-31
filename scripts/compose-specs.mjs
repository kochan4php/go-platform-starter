#!/usr/bin/env node
// Compose service-owned specs and add platform-wide documentation once.
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "js-yaml";

const root = fileURLToPath(new URL("..", import.meta.url));
const servicesDir = join(root, "services");
const methods = new Set(["get", "head", "post", "put", "patch", "delete"]);
const contractPackage = JSON.parse(readFileSync(join(root, "packages/contracts/package.json"), "utf8"));

const merged = {
  openapi: "3.1.0",
  info: {
    title: "platform aggregate API",
    version: contractPackage.version,
    description: "The complete, gateway-facing platform contract. Service specs remain the source of truth.",
  },
  servers: [
    { url: "http://127.0.0.1:8000", description: "development" },
    { url: "https://api.staging.example.com", description: "staging" },
    { url: "https://api.example.com", description: "production" },
  ],
  tags: [],
  paths: {},
  webhooks: {},
  components: {
    schemas: {
      EnvelopeMeta: {
        type: "object",
        required: ["limit", "offset", "total"],
        properties: {
          limit: { type: "integer", minimum: 1, default: 20 },
          offset: { type: "integer", minimum: 0, default: 0 },
          total: { type: "integer", format: "int64", minimum: 0 },
          nextCursor: { type: "string" },
          estimated: { type: "boolean", default: false },
          next: { type: "string" },
          prev: { type: "string" },
        },
      },
      ErrorCode: {
        type: "string",
        enum: ["bad_request", "unauthorized", "forbidden", "not_found", "conflict", "internal_server_error"],
      },
      BulkResult: {
        type: "object",
        required: ["processed", "failed"],
        properties: {
          processed: { type: "integer", minimum: 0, default: 0 },
          failed: { type: "integer", minimum: 0, default: 0 },
          errors: { type: "array", default: [], items: { type: "string" } },
        },
      },
      AsyncOperation: {
        type: "object",
        required: ["id", "status", "statusUrl"],
        properties: {
          id: { type: "string" },
          status: { type: "string", enum: ["pending", "running", "succeeded", "failed"], default: "pending" },
          statusUrl: { type: "string", format: "uri" },
        },
      },
      Health: {
        type: "object",
        required: ["status", "version", "commit"],
        properties: {
          status: { type: "string", example: "alive" },
          version: { type: "string", example: "0.1.0" },
          commit: { type: "string", example: "abc1234" },
          goVersion: { type: "string", example: "go1.25.0" },
          environment: { type: "string", example: "production" },
        },
      },
      EventEnvelope: {
        type: "object",
        required: ["event", "payload"],
        discriminator: { propertyName: "event" },
        oneOf: [
          { $ref: "#/components/schemas/UserCreatedEvent" },
          { $ref: "#/components/schemas/UserDeletedEvent" },
          { $ref: "#/components/schemas/AuditEntryEvent" },
        ],
      },
      UserCreatedEvent: {
        type: "object",
        required: ["event", "payload"],
        properties: {
          event: { const: "user.created" },
          payload: {
            type: "object",
            required: ["sub", "email"],
            properties: { sub: { type: "integer" }, email: { type: "string", format: "email" } },
          },
        },
      },
      UserDeletedEvent: {
        type: "object",
        required: ["event", "payload"],
        properties: {
          event: { const: "user.deleted" },
          payload: { type: "object", required: ["sub"], properties: { sub: { type: "integer" } } },
        },
      },
      AuditEntryEvent: {
        type: "object",
        required: ["event", "payload"],
        properties: {
          event: { const: "audit.entry" },
          payload: {
            type: "object",
            required: ["action", "entity"],
            properties: {
              action: { type: "string" },
              entity: { type: "string" },
              entityId: { type: "string" },
            },
          },
        },
      },
    },
    parameters: {
      IdempotencyKey: {
        name: "Idempotency-Key",
        in: "header",
        description: "Unique key for replay-safe POST requests; retained for 24 hours.",
        schema: { type: "string", maxLength: 128 },
      },
      Limit: {
        name: "limit",
        in: "query",
        schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
      },
      Offset: { name: "offset", in: "query", schema: { type: "integer", minimum: 0, default: 0 } },
      Cursor: {
        name: "cursor",
        in: "query",
        description: "Opaque keyset cursor returned in meta.nextCursor.",
        schema: { type: "string", maxLength: 200 },
      },
      Sort: {
        name: "sort",
        in: "query",
        description: "Allow-listed field; prefix with - for descending order.",
        schema: { type: "string" },
      },
      Filter: {
        name: "filter",
        in: "query",
        description: "Simple field filters use named query parameters; RSQL is deliberately unsupported.",
        schema: { type: "string" },
      },
      Fields: {
        name: "fields",
        in: "query",
        description: "Comma-separated sparse response fields.",
        schema: { type: "string", maxLength: 300 },
      },
      Include: {
        name: "include",
        in: "query",
        description: "Comma-separated related resources.",
        schema: { type: "string", maxLength: 200 },
      },
      Count: {
        name: "count",
        in: "query",
        schema: { type: "string", enum: ["exact", "estimate", "none"], default: "exact" },
      },
    },
    headers: {
      RateLimitLimit: { description: "Request limit for the current window.", schema: { type: "integer" } },
      RateLimitRemaining: {
        description: "Requests remaining in the current window.",
        schema: { type: "integer" },
      },
      RateLimitReset: {
        description: "Seconds until the current window resets.",
        schema: { type: "integer" },
      },
      Deprecation: { description: "RFC 9745 deprecation timestamp.", schema: { type: "string" } },
      Sunset: {
        description: "HTTP date after which the operation may be removed.",
        schema: { type: "string" },
      },
    },
    responses: {
      Error: {
        description: "Standard error envelope.",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/EnvelopeFail" },
            example: {
              success: false,
              message: "bad_request",
              error: "request does not match the API contract",
            },
          },
        },
      },
      AsyncAccepted: {
        description: "Accepted for asynchronous processing.",
        headers: {
          Location: { description: "Operation status URL.", schema: { type: "string", format: "uri" } },
        },
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/AsyncOperation" },
            example: {
              id: "op_123",
              status: "pending",
              statusUrl: "https://api.example.com/api/v1/operations/op_123",
            },
          },
        },
      },
    },
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      refreshCookie: { type: "apiKey", in: "cookie", name: "refresh_token" },
      internalSecret: { type: "apiKey", in: "header", name: "X-Internal-Secret" },
    },
  },
};

function exampleFor(schema, success = true) {
  if (!schema) return undefined;
  if (schema.$ref) return exampleFor(merged.components.schemas[schema.$ref.split("/").at(-1)], success);
  if (schema.allOf) return Object.assign({}, ...schema.allOf.map((part) => exampleFor(part, success) ?? {}));
  if (schema.example !== undefined) return schema.example;
  if (schema.type === "object")
    return Object.fromEntries(
      Object.entries(schema.properties ?? {}).map(([name, property]) => [
        name,
        exampleFor(property, success),
      ]),
    );
  if (schema.type === "array") return [exampleFor(schema.items, success)];
  if (schema.enum) return schema.default ?? schema.enum[0];
  if (schema.default !== undefined) return schema.default;
  if (schema.format === "email") return "user@example.com";
  if (schema.format === "date-time") return "2026-01-01T00:00:00Z";
  if (schema.format === "date") return "2026-01-01";
  if (schema.format === "uri") return "https://example.com/resource";
  if (schema.format === "binary") return "avatar.jpg";
  if (schema.type === "integer" || schema.type === "number") return 1;
  if (schema.type === "boolean") return success;
  if (schema.pattern?.includes("https://")) return "https://example.com/avatar.png";
  if (schema.pattern === "^[0-9]{6}$") return "123456";
  if (schema.pattern?.includes(":")) return "user:read:any";
  return "example".padEnd(schema.minLength ?? 0, "x");
}

function enrichOperation(service, method, operation) {
  operation.tags ??= [service];
  operation.summary ??= operation.operationId;
  operation.description ??= `${operation.summary}.`;
  operation.deprecated = operation.deprecated === true;
  if (operation["x-required-permission"] || operation["x-auth"] === "required")
    operation.security ??= [{ bearerAuth: [] }];
  if (operation["x-internal"]) operation.security = [{ internalSecret: [] }];
  if (method === "post") {
    operation.parameters ??= [];
    if (!operation.parameters.some((parameter) => parameter.$ref?.endsWith("/IdempotencyKey")))
      operation.parameters.push({ $ref: "#/components/parameters/IdempotencyKey" });
  }
  for (const [status, response] of Object.entries(operation.responses ?? {})) {
    if (response.$ref) continue;
    response.headers ??= {};
    for (const name of ["RateLimitLimit", "RateLimitRemaining", "RateLimitReset", "Deprecation", "Sunset"]) {
      const header = name.replace("RateLimit", "X-RateLimit-");
      response.headers[header] ??= { $ref: `#/components/headers/${name}` };
    }
    for (const media of Object.values(response.content ?? {}))
      media.example ??= exampleFor(media.schema, Number(status) < 400);
  }
  operation.responses ??= {};
  operation.responses.default ??= { $ref: "#/components/responses/Error" };
  for (const media of Object.values(operation.requestBody?.content ?? {}))
    media.example ??= exampleFor(media.schema);
}

for (const service of readdirSync(servicesDir).sort()) {
  let document;
  try {
    document = YAML.load(readFileSync(join(servicesDir, service, "openapi.yaml"), "utf8"));
  } catch {
    continue;
  }
  merged.tags.push({ name: service, description: `${service} service operations.` });
  for (const [path, pathItem] of Object.entries(document.paths ?? {})) {
    const target = structuredClone(pathItem);
    for (const [method, operation] of Object.entries(target))
      if (methods.has(method)) enrichOperation(service, method, operation);
    merged.paths[`/api/v1${path}`] = target;
  }
  for (const [kind, values] of Object.entries(document.components ?? {})) {
    merged.components[kind] ??= {};
    for (const [name, value] of Object.entries(values)) merged.components[kind][name] ??= value;
  }
}

if (merged.components.schemas.EnvelopeFail?.properties?.message) {
  merged.components.schemas.EnvelopeFail.properties.message = { $ref: "#/components/schemas/ErrorCode" };
}
const definedTags = new Map(merged.tags.map((tag) => [tag.name, tag]));
for (const pathItem of Object.values(merged.paths)) {
  for (const method of methods) {
    const operation = pathItem[method];
    if (!operation) continue;
    for (const tag of operation.tags ?? []) {
      if (!definedTags.has(tag)) definedTags.set(tag, { name: tag, description: `${tag} operations.` });
    }
    for (const [status, response] of Object.entries(operation.responses ?? {})) {
      if (response.$ref) continue;
      for (const media of Object.values(response.content ?? {}))
        media.example = exampleFor(media.schema, Number(status) < 400);
    }
    for (const media of Object.values(operation.requestBody?.content ?? {}))
      media.example = exampleFor(media.schema);
  }
}
merged.tags = [...definedTags.values()];

merged.tags.push({ name: "platform", description: "Shared health and build endpoints." });
merged.paths["/healthz"] = {
  get: {
    operationId: "healthz",
    tags: ["platform"],
    summary: "Check process liveness",
    description: "Returns build identity; detail=1 adds runtime and environment metadata.",
    deprecated: false,
    parameters: [{ name: "detail", in: "query", schema: { type: "integer", enum: [0, 1], default: 0 } }],
    responses: {
      200: {
        description: "alive",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/EnvelopeOK" },
            example: {
              success: true,
              message: "ok",
              data: { status: "alive", version: "0.1.0", commit: "abc1234" },
            },
          },
        },
      },
      default: { $ref: "#/components/responses/Error" },
    },
  },
};
merged.paths["/readyz"] = {
  get: {
    operationId: "readyz",
    tags: ["platform"],
    summary: "Check dependency readiness",
    description: "Returns 503 when any configured dependency or drain state is unhealthy.",
    deprecated: false,
    responses: {
      200: {
        description: "ready",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/EnvelopeOK" },
            example: { success: true, message: "ready", data: { postgres: { status: "ok", latencyMs: 1 } } },
          },
        },
      },
      default: { $ref: "#/components/responses/Error" },
    },
  },
};
merged.paths["/version"] = {
  get: {
    operationId: "version",
    tags: ["platform"],
    summary: "Read build identity",
    description: "Available on every service through the shared platform router.",
    deprecated: false,
    responses: {
      200: {
        description: "build identity",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/EnvelopeOK" },
            example: { success: true, message: "ok", data: { version: "0.1.0", commit: "abc1234" } },
          },
        },
      },
      default: { $ref: "#/components/responses/Error" },
    },
  },
};

merged.paths["/api/v1/auth/register"].post.responses["201"].links = {
  GetCreatedUser: { operationId: "getUser", parameters: { id: "$response.body#/data/id" } },
};
merged.webhooks = {
  userCreated: {
    post: {
      operationId: "onUserCreated",
      tags: ["events"],
      summary: "A user was created",
      description: "At-least-once users.events delivery.",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/UserCreatedEvent" },
            example: { event: "user.created", payload: { sub: 42, email: "user@example.com" } },
          },
        },
      },
      responses: { 204: { description: "accepted" } },
    },
  },
  auditEntry: {
    post: {
      operationId: "onAuditEntry",
      tags: ["events"],
      summary: "An audit entry was emitted",
      description: "At-least-once audit.events delivery.",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/AuditEntryEvent" },
            example: { event: "audit.entry", payload: { action: "login", entity: "user", entityId: "42" } },
          },
        },
      },
      responses: { 204: { description: "accepted" } },
    },
  },
};

const outDir = join(root, "packages", "contracts", "gen");
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "openapi.json"), `${JSON.stringify(merged, null, 2)}\n`);
const audit = [
  "# API schema defaults and nullability audit",
  "",
  "> Generated by `node scripts/compose-specs.mjs`; optional and nullable are intentionally reported separately.",
  "",
  "| Schema.property | Presence | Nullable | Default |",
  "| --- | --- | --- | --- |",
];
for (const [schemaName, schema] of Object.entries(merged.components.schemas).sort(([a], [b]) =>
  a.localeCompare(b),
)) {
  const required = new Set(schema.required ?? []);
  for (const [propertyName, property] of Object.entries(schema.properties ?? {}).sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    const nullable =
      property.nullable === true || (Array.isArray(property.type) && property.type.includes("null"));
    const defaultValue = property.default === undefined ? "—" : `\`${JSON.stringify(property.default)}\``;
    audit.push(
      `| \`${schemaName}.${propertyName}\` | ${required.has(propertyName) ? "required" : "optional"} | ${nullable ? "yes" : "no"} | ${defaultValue} |`,
    );
  }
}
audit.push("");
writeFileSync(join(root, "docs", "API_SCHEMA_AUDIT.md"), audit.join("\n"));
console.log(`composed ${Object.keys(merged.paths).length} paths -> packages/contracts/gen/openapi.json`);
