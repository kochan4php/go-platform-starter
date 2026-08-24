import { type RequestHandler, Router } from 'express';
import { container } from 'tsyringe';
import { AUTHENTICATED_METADATA_KEY, PERMISSION_METADATA_KEY, PUBLIC_METADATA_KEY } from './rbac/decorators.js';
import { isValidPermission } from './rbac/permission.catalog.js';
import { PermissionMiddleware } from './rbac/permission.middleware.js';
import { asyncHandler } from './utils/asyncHandler.js';

/**
 * @description Base class for feature routes. Every registered handler MUST declare
 * either @Public() or @RequirePermission() — the boot-time check below throws otherwise,
 * so a route can never silently ship without an access decision (fail-closed).
 */
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
    ): void {
        const isPublic = Reflect.getMetadata(PUBLIC_METADATA_KEY, target, propertyKey);
        const isAuthenticated = Reflect.getMetadata(AUTHENTICATED_METADATA_KEY, target, propertyKey);
        const permission = Reflect.getMetadata(PERMISSION_METADATA_KEY, target, propertyKey);

        if (!isPublic && !isAuthenticated && !permission) {
            throw new Error(
                `Route ${method.toUpperCase()} ${this.path}${path} is missing an authorization decorator on ${target.constructor.name}.${propertyKey}`,
            );
        }

        const handlers: RequestHandler[] = [];

        if (permission) {
            if (!isValidPermission(permission)) {
                throw new Error(
                    `Route ${method.toUpperCase()} ${this.path}${path} references unknown permission '${permission}' (not in permission catalog)`,
                );
            }
            const guard = container.resolve(PermissionMiddleware);
            handlers.push(guard.requirePermission(permission));
        } else if (isAuthenticated) {
            const guard = container.resolve(PermissionMiddleware);
            handlers.push(guard.requireAuthentication());
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
