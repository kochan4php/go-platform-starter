import type { ZodTypeAny } from 'zod';
import { z } from 'zod';

export interface OperationDoc {
    /** Full path including the versioned prefix, e.g. /api/v1/auth/login */
    path: string;
    method: 'get' | 'post' | 'put' | 'patch' | 'delete';
    tag?: string;
    summary?: string;
    description?: string;
    security?: 'bearer';
    body?: ZodTypeAny;
    query?: ZodTypeAny;
    params?: ZodTypeAny;
    /** Schema for the envelope `data` field; omitted responses stay generic. */
    responseData?: ZodTypeAny;
}

interface JsonSchemaObject {
    type?: string;
    properties?: Record<string, unknown>;
    required?: string[];
    [key: string]: unknown;
}

const enveloped = (dataSchema: JsonSchemaObject | undefined): JsonSchemaObject => ({
    type: 'object',
    properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        ...(dataSchema ? { data: dataSchema } : {}),
    },
    required: ['success', 'message'],
});

/**
 * @description Minimal OpenAPI 3.1 builder fed by zod schemas. DTOs are converted with
 * zod's native `z.toJSONSchema`, so validation and documentation share one source of
 * truth and the spec can never drift from the code.
 */
class OpenApiRegistry {
    private readonly operations: OperationDoc[] = [];

    public register(doc: OperationDoc): void {
        this.operations.push(doc);
    }

    /** Builds the full spec. Called once at boot; cheap enough to reuse the object after. */
    public build(info: { title: string; description?: string }): Record<string, unknown> {
        const paths: Record<string, Record<string, unknown>> = {};

        for (const op of this.operations) {
            const parameters: unknown[] = [];
            if (op.params) {
                const schema = op.params as unknown as { shape?: Record<string, ZodTypeAny> };
                for (const [name, field] of Object.entries(schema.shape ?? {})) {
                    parameters.push({
                        name,
                        in: 'path',
                        required: true,
                        schema: this.toJSON(field),
                    });
                }
            }
            if (op.query) {
                const schema = op.query as unknown as { shape?: Record<string, ZodTypeAny> };
                for (const [name, field] of Object.entries(schema.shape ?? {})) {
                    parameters.push({ name, in: 'query', required: false, schema: this.toJSON(field) });
                }
            }

            const operation: Record<string, unknown> = {
                tags: op.tag ? [op.tag] : undefined,
                summary: op.summary,
                description: op.description,
                security: op.security === 'bearer' ? [{ bearerAuth: [] }] : [],
                responses: {
                    default: {
                        description: 'Enveloped response',
                        content: {
                            'application/json': {
                                schema: enveloped(op.responseData ? this.toJSON(op.responseData) : undefined),
                            },
                        },
                    },
                },
            };
            if (parameters.length > 0) operation.parameters = parameters;
            if (op.body) {
                operation.requestBody = {
                    required: true,
                    content: { 'application/json': { schema: this.toJSON(op.body) } },
                };
            }

            paths[op.path] ??= {};
            paths[op.path][op.method] = operation;
        }

        return {
            openapi: '3.1.0',
            info: {
                title: info.title,
                version: '3.0.0',
                description: info.description,
            },
            servers: [{ url: '/' }],
            tags: [...new Set(this.operations.map((op) => op.tag).filter(Boolean))].map((name) => ({ name })),
            paths,
            components: {
                securitySchemes: {
                    bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
                },
            },
        };
    }

    private toJSON(schema: ZodTypeAny): JsonSchemaObject {
        return z.toJSONSchema(schema, { io: 'input', unrepresentable: 'any' }) as JsonSchemaObject;
    }
}

export const openApiRegistry = new OpenApiRegistry();
