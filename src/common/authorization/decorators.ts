import 'reflect-metadata';

export const PERMISSION_METADATA_KEY = 'permission';
export const PUBLIC_METADATA_KEY = 'isPublic';

export function RequirePermission(permission: string): MethodDecorator {
    return (target: Object, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
        Reflect.defineMetadata(PERMISSION_METADATA_KEY, permission, target, propertyKey);
    };
}

export function Public(): MethodDecorator {
    return (target: Object, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
        Reflect.defineMetadata(PUBLIC_METADATA_KEY, true, target, propertyKey);
    };
}
