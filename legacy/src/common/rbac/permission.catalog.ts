/**
 * @description The complete permission catalog. Single source of truth shared by the
 * seeder (which persists it) and BaseRoute (which fail-closes at boot on any route
 * referencing a permission outside this list).
 *
 * Convention: `<resource>:<action>:<scope>` where scope is `any` or `own`.
 */
export const PERMISSIONS = [
    'user:create:any',
    'user:read:any',
    'user:update:any',
    'user:delete:any',
    'role:create:any',
    'role:read:any',
    'role:update:any',
    'role:delete:any',
] as const;

export type PermissionName = (typeof PERMISSIONS)[number];

export function isValidPermission(permission: string): permission is PermissionName {
    return (PERMISSIONS as readonly string[]).includes(permission);
}
