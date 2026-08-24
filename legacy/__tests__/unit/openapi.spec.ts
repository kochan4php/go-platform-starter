import 'reflect-metadata';
import { container } from 'tsyringe';
import { beforeAll, describe, expect, it } from 'vitest';
import { App } from '../../src/app.js';
import { openApiRegistry } from '../../src/openapi/registry.js';

let app: ReturnType<typeof import('express').express>;

beforeAll(() => {
    app = container.resolve(App).instance;
});

describe('generated OpenAPI spec', () => {
    it('emits an OpenAPI 3.1 document', () => {
        const res = openApiRegistry.build({ title: 'Express TS Starter API' });
        expect(res.openapi).toBe('3.1.0');
    });

    it('contains every registered route path', () => {
        const spec = openApiRegistry.build({ title: 't' });
        const paths = Object.keys(spec.paths as Record<string, unknown>);

        for (const expected of [
            '/api/v1',
            '/api/v1/health',
            '/api/v1/auth/login',
            '/api/v1/users/me',
            '/api/v1/users/{id}',
            '/api/v1/roles/{id}/permissions',
            '/api/v1/permissions',
        ]) {
            expect(paths).toContain(expected);
        }
    });

    it('derives request bodies from zod DTOs', () => {
        const spec = openApiRegistry.build({ title: 't' }) as any;
        const body = spec.paths['/api/v1/auth/login'].post.requestBody.content['application/json'].schema;
        expect(body.properties.loginType).toBeDefined();
        expect(body.properties.password).toBeDefined();
        expect(body.required).toContain('loginType');
    });

    it('generates path parameters from params schemas', () => {
        const spec = openApiRegistry.build({ title: 't' }) as any;
        const operation = spec.paths['/api/v1/users/{id}'].delete;
        expect(operation.parameters[0].name).toBe('id');
        expect(operation.parameters[0].in).toBe('path');
        expect(operation.parameters[0].required).toBe(true);
    });

    it('marks bearer-protected operations and wraps responses in the envelope', () => {
        const spec = openApiRegistry.build({ title: 't' }) as any;
        const usersList = spec.paths['/api/v1/users'].get;
        expect(usersList.security).toEqual([{ bearerAuth: [] }]);
        const responseSchema = usersList.responses.default.content['application/json'].schema;
        expect(responseSchema.properties.success.type).toBe('boolean');
    });

    it('serves the spec at /docs/openapi.json', async () => {
        const supertest = (await import('supertest')).default;
        const res = await supertest(app).get('/docs/openapi.json');
        expect(res.status).toBe(200);
        expect(res.body.openapi).toBe('3.1.0');
        expect(Object.keys(res.body.paths).length).toBeGreaterThanOrEqual(14);
    });
});
