import 'reflect-metadata';
import { container } from 'tsyringe';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { JwtAuthGuard } from '../../src/common/authorization/guards/jwt-auth.guard.js';
import { UnauthorizedError } from '../../src/common/errors/AppError.js';
import { AccessTokenHelper } from '../../src/common/utils/jwt/helpers/access-token.helper.js';

describe('JwtAuthGuard', () => {
    let guard: JwtAuthGuard;

    beforeEach(() => {
        vi.clearAllMocks();
        guard = container.resolve(JwtAuthGuard);
    });

    it('should throw UnauthorizedError if no authorization header is present', async () => {
        const req = { headers: {} } as any;
        const res = {} as any;
        const next = vi.fn();

        await expect(guard.verify(req, res, next)).rejects.toThrow(UnauthorizedError);
        await expect(guard.verify(req, res, next)).rejects.toThrow('Token missing or invalid');
    });

    it('should throw UnauthorizedError if token is invalid or expired', async () => {
        const req = { headers: { authorization: 'Bearer invalid_token' } } as any;
        const res = {} as any;
        const next = vi.fn();

        vi.spyOn(AccessTokenHelper, 'verifyAccessToken').mockRejectedValue(new Error('jwt malformed'));

        await expect(guard.verify(req, res, next)).rejects.toThrow(UnauthorizedError);
        await expect(guard.verify(req, res, next)).rejects.toThrow('Token invalid or expired');
    });

    it('should set req.user and call next if token is valid', async () => {
        const req = { headers: { authorization: 'Bearer valid_token' } } as any;
        const res = {} as any;
        const next = vi.fn();
        const payload = { id: '123', role: 'admin' };

        vi.spyOn(AccessTokenHelper, 'verifyAccessToken').mockResolvedValue(payload as any);
        vi.spyOn(AccessTokenHelper, 'getUserPayloadFromAccessToken').mockReturnValue(payload as any);

        await guard.verify(req, res, next);

        expect(req.user).toEqual(payload);
        expect(next).toHaveBeenCalledTimes(1);
    });
});
