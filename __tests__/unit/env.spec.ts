import { describe, expect, it } from 'vitest';
import { parseEnv } from '../../src/config/env.js';

const validEnv = {
    DATABASE_URL: 'postgresql://dev:dev@localhost:5432/expressts',
    ACCESS_TOKEN_SECRET: 'dsklamfklsamfklswamklas',
    REFRESH_TOKEN_SECRET: 'ldkcmsamfklasmfklasm',
    SESSION_TOKEN_SECRET: 'kasdmalkdmasklmaskl',
};

describe('parseEnv', () => {
    it('accepts a minimal valid environment and applies defaults', () => {
        const result = parseEnv(validEnv);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.PORT).toBe(3000);
            expect(result.data.DB_POOL_MAX).toBe(20);
            expect(result.data.ACCESS_TOKEN_TTL).toBe('5h');
            expect(result.data.REFRESH_TOKEN_TTL_DAYS).toBe(5);
            expect(result.data.SESSION_COOKIE_SECURE).toBe(false);
            expect(result.data.MAILER_DRIVER).toBe('console');
            expect(result.data.TRUSTED_DOMAINS).toEqual([]);
        }
    });

    it('coerces numeric strings and splits TRUSTED_DOMAINS', () => {
        const result = parseEnv({ ...validEnv, PORT: '8080', TRUSTED_DOMAINS: ' http://a.com , http://b.com ,' });
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.PORT).toBe(8080);
            expect(result.data.TRUSTED_DOMAINS).toEqual(['http://a.com', 'http://b.com']);
        }
    });

    it('fails with a readable report listing every missing variable', () => {
        const result = parseEnv({});
        expect(result.success).toBe(false);
        if (!result.success) {
            for (const name of ['DATABASE_URL', 'ACCESS_TOKEN_SECRET', 'REFRESH_TOKEN_SECRET', 'SESSION_TOKEN_SECRET']) {
                expect(result.error).toContain(name);
            }
            expect(result.error).toContain('Invalid environment configuration');
        }
    });

    it('rejects secrets shorter than 16 chars', () => {
        const result = parseEnv({ ...validEnv, ACCESS_TOKEN_SECRET: 'short' });
        expect(result.success).toBe(false);
    });

    it('rejects malformed token durations and out-of-range ports', () => {
        expect(parseEnv({ ...validEnv, ACCESS_TOKEN_TTL: 'five hours' }).success).toBe(false);
        expect(parseEnv({ ...validEnv, PORT: '99999' }).success).toBe(false);
        expect(parseEnv({ ...validEnv, MAILER_DRIVER: 'carrier-pigeon' }).success).toBe(false);
    });
});
