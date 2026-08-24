import 'reflect-metadata';

export const PERMISSION_METADATA_KEY = 'permission';
export const PUBLIC_METADATA_KEY = 'isPublic';
export const AUTHENTICATED_METADATA_KEY = 'isAuthenticated';

/**
 * @description Marks a route handler as requiring the given permission.
 * Validated against the permission catalog at boot (fail-closed).
 */
export function RequirePermission(permission: string): MethodDecorator {
    return (target: object, propertyKey: string | symbol) => {
        Reflect.defineMetadata(PERMISSION_METADATA_KEY, permission, target, propertyKey);
    };
}

/**
 * @description Marks a route handler as requiring any authenticated user,
 * without a specific permission check.
 */
export function Authenticated(): MethodDecorator {
    return (target: object, propertyKey: string | symbol) => {
        Reflect.defineMetadata(AUTHENTICATED_METADATA_KEY, true, target, propertyKey);
    };
}

/**
 * @description Marks a route handler as publicly accessible (no auth).
 */
export function Public(): MethodDecorator {
    return (target: object, propertyKey: string | symbol) => {
        Reflect.defineMetadata(PUBLIC_METADATA_KEY, true, target, propertyKey);
    };
}
