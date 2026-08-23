import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { inject, injectable } from 'tsyringe';
import { ForbiddenError } from '../errors/AppError.js';
import type DecodedUser from '../types/decoded-user.js';
import type IRequest from '../types/i-request.js';
import type { IAuthGuard } from './guards/i-auth.guard.js';
import type { PermissionService } from './permission.service.js';

/**
 * @description Factory for the permission-enforcing middleware. Verifies identity via
 * the auth guard, then checks the resolved permission set. Fails closed.
 */
@injectable()
export class PermissionMiddleware {
    constructor(
        @inject('IAuthGuard') private readonly authGuard: IAuthGuard,
        private readonly permissionService: PermissionService,
    ) {}

    public requirePermission(permission: string): RequestHandler {
        return async (req: Request, res: Response, next: NextFunction) => {
            try {
                await this.authGuard.verify(req as IRequest, res, () => {});

                const user = (req as IRequest).user as DecodedUser | undefined;
                if (!user) {
                    throw new ForbiddenError('User not attached by auth guard');
                }

                const allowed = await this.permissionService.hasPermission(user.id, permission);
                if (!allowed) {
                    throw new ForbiddenError(`You do not have the required permission: ${permission}`);
                }

                user.permissions = await this.permissionService.getPermissions(user.id);
                next();
            } catch (error) {
                next(error);
            }
        };
    }
}
