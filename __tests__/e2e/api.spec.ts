import 'reflect-metadata';
import supertest, { type Agent } from 'supertest';
import { container } from 'tsyringe';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { App } from '../../src/app.js';
import { closeDatabase, connectDatabase } from '../../src/database/connection.js';
import { migrator } from '../../src/database/migrator.js';
import { Permission } from '../../src/database/models/permission.model.js';
import { Role } from '../../src/database/models/role.model.js';
import { User } from '../../src/database/models/user.model.js';
import { UserRole } from '../../src/database/models/user-role.model.js';
import { seed } from '../../src/database/seeders/index.js';
import { PasswordResetService } from '../../src/modules/auth/password-reset.service.js';

let app: ReturnType<typeof import('express').express>;
const EMAIL_SUFFIX = () => `e2e-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;

async function registerUser(overrides: Record<string, unknown> = {}): Promise<{ email: string; password: string }> {
    const email = (overrides.email as string) ?? EMAIL_SUFFIX();
    const res = await supertest(app)
        .post('/api/v1/auth/register')
        .send({
            name: 'E2E User',
            phoneNumber: `08${Math.floor(Math.random() * 1e10)}`,
            email,
            password: 'password123',
            ...overrides,
        });
    return { email, password: (overrides.password as string) ?? 'password123', status: res.status } as any;
}

async function login(email: string, password = 'password123'): Promise<{ accessToken: string; refreshToken: string }> {
    const res = await supertest(app).post('/api/v1/auth/login').send({ loginType: email, password });
    expect(res.status).toBe(200);
    return res.body.data;
}

async function grantRole(userId: string, roleName: string): Promise<void> {
    const role = await Role.findOne({ where: { name: roleName } });
    if (!role) throw new Error(`role ${roleName} not seeded`);
    await UserRole.create({ userId, roleId: role.id });
}

async function userIdForToken(accessToken: string): Promise<string> {
    const payload = JSON.parse(Buffer.from(accessToken.split('.')[1], 'base64url').toString());
    return payload.id;
}

beforeAll(async () => {
    await connectDatabase(3, 1000);
    await migrator.up();
    await seed();
    app = container.resolve(App).instance;
});

afterAll(async () => {
    await closeDatabase();
});

describe('core + health', () => {
    it('GET /api/v1 returns the welcome envelope', async () => {
        const res = await supertest(app).get('/api/v1');
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });

    it('echoes a provided x-request-id and mints one when absent', async () => {
        const echoed = await supertest(app).get('/api/v1').set('x-request-id', 'trace-abc-123');
        expect(echoed.headers['x-request-id']).toBe('trace-abc-123');

        const minted = await supertest(app).get('/api/v1');
        expect(minted.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/i);
    });

    it('GET /api/v1/health and /db report healthy', async () => {
        expect((await supertest(app).get('/api/v1/health')).status).toBe(200);
        const dbRes = await supertest(app).get('/api/v1/health/db');
        expect(dbRes.status).toBe(200);
        expect(dbRes.body.data.dbHealthy).toBe(true);
    });
});

describe('auth lifecycle', () => {
    it('register -> duplicate rejected with 409', async () => {
        const { email } = await registerUser({});
        const dup = await supertest(app)
            .post('/api/v1/auth/register')
            .send({
                name: 'Dup',
                phoneNumber: `08${Math.floor(Math.random() * 1e10)}`,
                email,
                password: 'password123',
            });
        expect(dup.status).toBe(409);
        expect(dup.body.success).toBe(false);
    });

    it('login failures are uniform (no user enumeration)', async () => {
        const { email } = await registerUser({});
        const wrongPassword = await supertest(app).post('/api/v1/auth/login').send({ loginType: email, password: 'wrong!' });
        const unknownUser = await supertest(app).post('/api/v1/auth/login').send({ loginType: 'nobody@example.com', password: 'wrong!' });

        expect(wrongPassword.status).toBe(401);
        expect(unknownUser.status).toBe(401);
        expect(wrongPassword.body.message).toBe(unknownUser.body.message);
    });

    it('login sets httpOnly session cookie and returns tokens; refresh rotates them', async () => {
        const { email } = await registerUser({});
        const httpAgent: Agent = supertest.agent(app);

        const loginRes = await httpAgent.post('/api/v1/auth/login').send({ loginType: email, password: 'password123' });
        expect(loginRes.status).toBe(200);
        const setCookieHeader = loginRes.headers['set-cookie'] as unknown as string[];
        const sessionCookie = Array.isArray(setCookieHeader) ? setCookieHeader.join(';') : String(setCookieHeader);
        expect(sessionCookie).toContain('session-backend=');
        expect(sessionCookie.toLowerCase()).toContain('httponly');

        const firstRefreshToken = loginRes.body.data.refreshToken;

        const refreshRes = await httpAgent.get('/api/v1/auth/refresh-token');
        expect(refreshRes.status).toBe(200);
        const secondRefreshToken = refreshRes.body.data.refreshToken;
        expect(secondRefreshToken).toBeTruthy();
        // rotation: the old refresh token must not be reused silently
        expect(secondRefreshToken).not.toBe(firstRefreshToken);
    });

    it('logout revokes the session so refresh afterwards fails', async () => {
        const { email } = await registerUser({});
        const httpAgent: Agent = supertest.agent(app);
        await httpAgent.post('/api/v1/auth/login').send({ loginType: email, password: 'password123' });

        const logoutRes = await httpAgent.delete('/api/v1/auth/logout');
        expect(logoutRes.status).toBe(200);

        const refreshAfterLogout = await httpAgent.get('/api/v1/auth/refresh-token');
        expect([401, 403]).toContain(refreshAfterLogout.status);
        expect(refreshAfterLogout.body.success).toBe(false);
    });

    it('refresh without cookie is 401', async () => {
        const res = await supertest(app).get('/api/v1/auth/refresh-token');
        expect(res.status).toBe(401);
    });
});

describe('login lockout', () => {
    it('locks the account after repeated failures — even for the correct password', async () => {
        const { email } = await registerUser({});
        const userId = await userIdForToken((await login(email)).accessToken);

        // N-1 failures increment, Nth locks (LOGIN_MAX_ATTEMPTS defaults to 5)
        for (let i = 0; i < 5; i++) {
            const res = await supertest(app).post('/api/v1/auth/login').send({ loginType: email, password: 'wrong!' });
            expect(res.status).toBe(401);
            expect(res.body.message).toBe('Invalid credentials');
        }

        // Correct password is rejected while locked, with the same uniform message
        const locked = await supertest(app).post('/api/v1/auth/login').send({ loginType: email, password: 'password123' });
        expect(locked.status).toBe(401);
        expect(locked.body.message).toBe('Invalid credentials');

        const user = await User.findByPk(userId);
        expect(user).toBeTruthy();
        expect(user!.lockedUntil).toBeTruthy();
        expect(user!.lockedUntil!.getTime()).toBeGreaterThan(Date.now());
        expect(user!.failedLoginAttempts).toBe(0);
    });

    it('resets the failure counter on successful login', async () => {
        const { email } = await registerUser({});
        const userId = await userIdForToken((await login(email)).accessToken);

        await supertest(app).post('/api/v1/auth/login').send({ loginType: email, password: 'wrong!' });
        await supertest(app).post('/api/v1/auth/login').send({ loginType: email, password: 'wrong!' });
        await login(email); // success resets

        const user = await User.findByPk(userId);
        expect(user?.failedLoginAttempts).toBe(0);
        expect(user?.lockedUntil).toBeNull();
    });

    it('unknown identities stay uniform with wrong passwords', async () => {
        const unknown = await supertest(app)
            .post('/api/v1/auth/login')
            .send({ loginType: `ghost-${Date.now()}@example.com`, password: 'whatever' });
        expect(unknown.status).toBe(401);
        expect(unknown.body.message).toBe('Invalid credentials');
    });
});

describe('password reset flow', () => {
    it('forgot-password never reveals whether the account exists', async () => {
        const { email } = await registerUser({});
        const known = await supertest(app).post('/api/v1/auth/forgot-password').send({ email });
        const unknown = await supertest(app)
            .post('/api/v1/auth/forgot-password')
            .send({ email: `nope-${Date.now()}@example.com` });

        expect(known.status).toBe(200);
        expect(unknown.status).toBe(200);
        expect(known.body.message).toBe(unknown.body.message);
    });

    it('reset rotates the password and kills every existing session', async () => {
        const { email } = await registerUser({});
        const httpAgent: Agent = supertest.agent(app);
        const { accessToken } = await login(email);
        const userId = await userIdForToken(accessToken);

        // establish a refreshable session that must die after reset
        await httpAgent.post('/api/v1/auth/login').send({ loginType: email, password: 'password123' });

        await supertest(app).post('/api/v1/auth/forgot-password').send({ email });

        const resetService = container.resolve(PasswordResetService);
        const token = resetService.createToken(userId);

        const bad = await supertest(app).post('/api/v1/auth/reset-password').send({ token: 'garbage-token-value', password: 'newpass456' });
        expect(bad.status).toBe(400);

        const ok = await supertest(app).post('/api/v1/auth/reset-password').send({ token, password: 'newpass456' });
        expect(ok.status).toBe(200);

        // old session cookie is dead
        const staleRefresh = await httpAgent.get('/api/v1/auth/refresh-token');
        expect([401, 403]).toContain(staleRefresh.status);

        // old password rejected, new password accepted
        const oldLogin = await supertest(app).post('/api/v1/auth/login').send({ loginType: email, password: 'password123' });
        expect(oldLogin.status).toBe(401);
        const newLogin = await supertest(app).post('/api/v1/auth/login').send({ loginType: email, password: 'newpass456' });
        expect(newLogin.status).toBe(200);
    });
});

describe('authenticated user context (/users/me)', () => {
    it('rejects missing token with 401', async () => {
        const res = await supertest(app).get('/api/v1/users/me');
        expect(res.status).toBe(401);
    });

    it('rejects invalid token with 401', async () => {
        const res = await supertest(app).get('/api/v1/users/me').set('Authorization', 'Bearer not.a.jwt');
        expect(res.status).toBe(401);
    });

    it('returns the current profile for a valid token', async () => {
        const { email } = await registerUser({});
        const { accessToken } = await login(email);
        const res = await supertest(app).get('/api/v1/users/me').set('Authorization', `Bearer ${accessToken}`);
        expect(res.status).toBe(200);
        expect(res.body.data.user.email).toBe(email);
        expect(res.body.data.user.password).toBeUndefined();
    });
});

describe('RBAC enforcement on /users admin surface', () => {
    let adminToken = '';
    let plainToken = '';

    beforeAll(async () => {
        const { email: adminEmail } = await registerUser({ name: 'Admin' });
        await grantRole(await userIdForToken((await login(adminEmail)).accessToken), 'admin');
        adminToken = (await login(adminEmail)).accessToken;

        const { email: plainEmail } = await registerUser({ name: 'Plain' });
        plainToken = (await login(plainEmail)).accessToken;
    });

    it('401 without token / 403 without permission / 200 for admin', async () => {
        expect((await supertest(app).get('/api/v1/users')).status).toBe(401);
        expect((await supertest(app).get('/api/v1/users').set('Authorization', `Bearer ${plainToken}`)).status).toBe(403);

        const ok = await supertest(app).get('/api/v1/users?limit=5&offset=0').set('Authorization', `Bearer ${adminToken}`);
        expect(ok.status).toBe(200);
        expect(Array.isArray(ok.body.data.users)).toBe(true);
        for (const user of ok.body.data.users) {
            expect(user.password).toBeUndefined();
        }
    });

    it('403 body explains the missing permission', async () => {
        const res = await supertest(app).get('/api/v1/users').set('Authorization', `Bearer ${plainToken}`);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toContain('permission');
    });

    it('admin CRUD round-trip', async () => {
        const created = await supertest(app)
            .post('/api/v1/users')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ name: 'CRUD', phoneNumber: `08${Math.floor(Math.random() * 1e10)}`, email: EMAIL_SUFFIX(), password: 'password123' });
        expect(created.status).toBe(201);
        const id = created.body.data.user.id;
        expect(created.body.data.user.password).toBeUndefined();

        const updated = await supertest(app)
            .put(`/api/v1/users/${id}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ name: 'CRUD v2' });
        expect(updated.status).toBe(200);
        expect(updated.body.data.user.name).toBe('CRUD v2');

        expect((await supertest(app).delete(`/api/v1/users/${id}`).set('Authorization', `Bearer ${adminToken}`)).status).toBe(200);
        expect((await supertest(app).get(`/api/v1/users/${id}`).set('Authorization', `Bearer ${adminToken}`)).status).toBe(404);
    });

    it('duplicate create conflicts with 409', async () => {
        const { email } = await registerUser({});
        const res = await supertest(app)
            .post('/api/v1/users')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ name: 'X', phoneNumber: `08${Math.floor(Math.random() * 1e10)}`, email, password: 'password123' });
        expect(res.status).toBe(409);
    });

    it('unknown ids are validated by zod (400, not crash)', async () => {
        const res = await supertest(app).get('/api/v1/users/not-a-uuid').set('Authorization', `Bearer ${adminToken}`);
        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
    });
});

describe('roles module', () => {
    let adminToken = '';

    beforeAll(async () => {
        const { email } = await registerUser({ name: 'Roles Admin' });
        const firstLogin = await login(email);
        await grantRole(await userIdForToken(firstLogin.accessToken), 'admin');
        adminToken = (await login(email)).accessToken;
    });

    it('catalog endpoint lists known permissions', async () => {
        const res = await supertest(app).get('/api/v1/permissions').set('Authorization', `Bearer ${adminToken}`);
        expect(res.status).toBe(200);
        expect(res.body.data.permissions).toContain('user:read:any');
    });

    it('create -> sync permissions -> read -> replace -> delete', async () => {
        const created = await supertest(app)
            .post('/api/v1/roles')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ name: `viewer-${Date.now()}`, description: 'read-only', permissions: ['user:read:any'] });
        expect(created.status).toBe(201);
        const roleId = created.body.data.role.id;

        const perms = await supertest(app).get(`/api/v1/roles/${roleId}/permissions`).set('Authorization', `Bearer ${adminToken}`);
        expect(perms.status).toBe(200);
        expect(perms.body.data.permissions.map((p: any) => p.name)).toEqual(['user:read:any']);

        const replaced = await supertest(app)
            .put(`/api/v1/roles/${roleId}/permissions`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ permissions: ['role:read:any'] });
        expect(replaced.status).toBe(200);

        const permsAfter = await supertest(app).get(`/api/v1/roles/${roleId}/permissions`).set('Authorization', `Bearer ${adminToken}`);
        expect(permsAfter.body.data.permissions.map((p: any) => p.name)).toEqual(['role:read:any']);

        const updated = await supertest(app)
            .put(`/api/v1/roles/${roleId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ description: 'updated' });
        expect(updated.body.data.role.description).toBe('updated');

        expect((await supertest(app).delete(`/api/v1/roles/${roleId}`).set('Authorization', `Bearer ${adminToken}`)).status).toBe(200);
        const orphanedPermissions = await Permission.findAll();
        expect(orphanedPermissions.length).toBeGreaterThan(0);
    });

    it('rejects replacing permissions with unknown names', async () => {
        const created = await supertest(app)
            .post('/api/v1/roles')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ name: `nope-${Date.now()}` });
        const roleId = created.body.data.role.id;

        const bad = await supertest(app)
            .put(`/api/v1/roles/${roleId}/permissions`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ permissions: ['galaxy:destroy:any'] });
        expect(bad.status).toBe(400);
    });

    it('plain users are forbidden from role management', async () => {
        const { email } = await registerUser({ name: 'NoRoles' });
        const { accessToken } = await login(email);
        const res = await supertest(app).get('/api/v1/roles').set('Authorization', `Bearer ${accessToken}`);
        expect(res.status).toBe(403);
    });
});
