import { describe, expect, it } from 'vitest';
import { isValidPermission, PERMISSIONS } from '../../src/common/rbac/permission.catalog.js';

describe('permission catalog', () => {
    it('exposes a non-empty catalog', () => {
        expect(PERMISSIONS.length).toBeGreaterThan(0);
    });

    it('follows resource:action:scope convention', () => {
        for (const permission of PERMISSIONS) {
            expect(permission).toMatch(/^[a-z]+:[a-z]+:(any|own)$/);
        }
    });

    it('validates known permissions and rejects unknown ones', () => {
        expect(isValidPermission('user:read:any')).toBe(true);
        expect(isValidPermission('user:read:galaxy')).toBe(false);
        expect(isValidPermission('')).toBe(false);
    });

    it('contains no duplicates', () => {
        expect(new Set(PERMISSIONS).size).toBe(PERMISSIONS.length);
    });
});
