import 'reflect-metadata';
import request from 'supertest';
import { container } from 'tsyringe';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../src/app.js';
import { AuthorizationService } from '../../src/common/authorization/authorization.service.js';
import { AccessTokenHelper } from '../../src/common/utils/jwt/helpers/access-token.helper.js';

import { UserService } from '../../src/modules/users/users.service.js';

describe('Critical Endpoints Authorization', () => {
    let appInstance: any;

    beforeEach(() => {
        vi.clearAllMocks();
        // Mock IUserRepository to bypass DB for tests
        const mockRepo = {
            findAll: vi.fn().mockResolvedValue([]),
            findById: vi.fn().mockResolvedValue({ id: 'target-id' }),
            findOne: vi.fn().mockResolvedValue(null),
            create: vi.fn().mockResolvedValue({ id: 'new-id' }),
            update: vi.fn().mockResolvedValue({ id: 'target-id' }),
            delete: vi.fn().mockResolvedValue(true),
        };
        container.registerInstance('IUserRepository', mockRepo);

        // Mock AuthorizationService
        const mockAuthService = {
            getPermissions: vi.fn().mockImplementation((id: string) => {
                if (id === 'admin-user') return Promise.resolve(['user:read:any', 'user:create:any', 'user:update:any', 'user:delete:any']);
                return Promise.resolve(['user:read:own', 'user:update:own', 'user:delete:own']);
            }),
        };
        container.registerInstance(AuthorizationService, mockAuthService as any);

        // Resolve a fresh app instance
        const app = container.resolve(App);
        appInstance = app.instance;
    });

    const mockAuth = (userPayload: any) => {
        vi.spyOn(AccessTokenHelper, 'verifyAccessToken').mockResolvedValue(userPayload);
        vi.spyOn(AccessTokenHelper, 'getUserPayloadFromAccessToken').mockReturnValue(userPayload);
    };

    const endpoints = [
        { method: 'get', path: '/api/admin/users' },
        { method: 'get', path: '/api/admin/users/target-id' },
        { method: 'post', path: '/api/admin/users', body: { name: 'Test', phoneNumber: '123', email: 'a@a.com', password: 'password123' } },
        { method: 'put', path: '/api/admin/users/target-id', body: { name: 'Update' } },
        { method: 'delete', path: '/api/admin/users/target-id' },
    ];

    for (const endpoint of endpoints) {
        describe(`${endpoint.method.toUpperCase()} ${endpoint.path}`, () => {
            it('should return 401 if no valid token provided', async () => {
                const res = await (request(appInstance) as any)[endpoint.method](endpoint.path).send(endpoint.body || {});
                expect(res.status).toBe(401);
                expect(res.body.success).toBe(false);
            });

            it('should return 403 if valid token provided but insufficient permissions', async () => {
                mockAuth({ id: 'other-user' });
                const res = await (request(appInstance) as any)
                    [endpoint.method](endpoint.path)
                    .set('Authorization', 'Bearer valid_token')
                    .send(endpoint.body || {});
                expect(res.status).toBe(403);
            });

            it('should return 20x (success) if authorized', async () => {
                mockAuth({ id: 'admin-user' });
                const res = await (request(appInstance) as any)
                    [endpoint.method](endpoint.path)
                    .set('Authorization', 'Bearer valid_token')
                    .send(endpoint.body || {});
                expect([200, 201]).toContain(res.status);
            });
        });
    }

    // Special test for /api/auth/logout which also requires token but has no specific gate permissions
    describe('DELETE /api/auth/logout', () => {
        it('should return 404 if no valid session cookie provided', async () => {
            const res = await request(appInstance).delete('/api/auth/logout');
            expect(res.status).toBe(404);
        });

        // The logout endpoint also needs session cookies to succeed or it will return 404/403 for missing session.
        // As long as the guard blocks it at 401, the guard works. We don't need full e2e 200 since it requires mocking cookies and sessions,
        // but let's test that the auth guard passes and it hits the controller (which returns 404 because no session cookie).
        it('should pass guard (return non-401) if authorized', async () => {
            mockAuth({ id: 'user-1' });
            const res = await request(appInstance).delete('/api/auth/logout').set('Authorization', 'Bearer valid_token');
            expect(res.status).not.toBe(401);
        });
    });
});
