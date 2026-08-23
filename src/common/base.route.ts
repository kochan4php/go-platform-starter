import { type RequestHandler, Router } from 'express';
import { container } from 'tsyringe';
import { PERMISSION_METADATA_KEY, PUBLIC_METADATA_KEY } from './authorization/decorators.js';
import { PermissionGuard } from './authorization/permission.guard.js';
import { PermissionRegistry } from './authorization/permission.registry.js';
import { asyncHandler } from './utils/asyncHandler.js';

export abstract class BaseRoute {
    public router: Router;
    public path: string;

    protected constructor(path: string) {
        this.path = path;
        this.router = Router();
    }

    protected abstract initializeRoutes(): void;

    private registerRoute(
        method: 'get' | 'post' | 'put' | 'patch' | 'delete',
        path: string,
        middlewares: RequestHandler[],
        target: any,
        propertyKey: string,
    ) {
        const isPublic = Reflect.getMetadata(PUBLIC_METADATA_KEY, target, propertyKey);
        const permission = Reflect.getMetadata(PERMISSION_METADATA_KEY, target, propertyKey);

        if (!isPublic && !permission) {
            throw new Error(
                `Route ${method.toUpperCase()} ${this.path}${path} is missing an authorization decorator on ${target.constructor.name}.${propertyKey}`,
            );
        }

        const handlers: RequestHandler[] = [];

        if (permission) {
            const registry = container.resolve(PermissionRegistry);
            if (!registry.isValid(permission)) {
                throw new Error(`Route ${method.toUpperCase()} ${this.path}${path} references unknown permission '${permission}'`);
            }
            const guard = container.resolve(PermissionGuard);
            handlers.push(guard.createMiddleware(permission));
        }

        handlers.push(...middlewares);
        handlers.push(asyncHandler(target[propertyKey].bind(target)));

        this.router[method](path, ...handlers);
    }

    protected get(path: string, middlewares: RequestHandler[], target: any, propertyKey: string): void {
        this.registerRoute('get', path, middlewares, target, propertyKey);
    }

    protected post(path: string, middlewares: RequestHandler[], target: any, propertyKey: string): void {
        this.registerRoute('post', path, middlewares, target, propertyKey);
    }

    protected put(path: string, middlewares: RequestHandler[], target: any, propertyKey: string): void {
        this.registerRoute('put', path, middlewares, target, propertyKey);
    }

    protected patch(path: string, middlewares: RequestHandler[], target: any, propertyKey: string): void {
        this.registerRoute('patch', path, middlewares, target, propertyKey);
    }

    protected delete(path: string, middlewares: RequestHandler[], target: any, propertyKey: string): void {
        this.registerRoute('delete', path, middlewares, target, propertyKey);
    }
}
