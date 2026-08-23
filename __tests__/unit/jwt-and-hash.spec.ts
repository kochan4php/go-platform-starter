import { describe, expect, it } from 'vitest';
import { HashHelper } from '../../src/common/utils/hash.helper.js';
import { JwtHelper } from '../../src/common/utils/jwt/jwt.js';

describe('HashHelper', () => {
    it('hashes and verifies a password', async () => {
        const hash = await HashHelper.hash('s3cret-password');
        expect(hash).not.toBe('s3cret-password');
        expect(await HashHelper.compare('s3cret-password', hash)).toBe(true);
        expect(await HashHelper.compare('wrong', hash)).toBe(false);
    });
});

describe('JwtHelper', () => {
    const secret = 'test-secret';
    it('signs and verifies round-trip', async () => {
        const token = JwtHelper.generateToken({ id: 'u1' }, secret, '1h');
        const decoded = (await JwtHelper.verifyToken(token, secret)) as any;
        expect(decoded.id).toBe('u1');
    });

    it('rejects tampered tokens', async () => {
        const token = JwtHelper.generateToken({ id: 'u1' }, secret, '1h');
        await expect(JwtHelper.verifyToken(`${token}x`, secret)).rejects.toThrow();
    });

    it('rejects expired tokens', async () => {
        vi.useFakeTimers();
        const token = JwtHelper.generateToken({ id: 'u1' }, secret, '1ms');
        vi.advanceTimersByTime(5_000);
        await expect(JwtHelper.verifyToken(token, secret)).rejects.toThrow();
        vi.useRealTimers();
    });
});
