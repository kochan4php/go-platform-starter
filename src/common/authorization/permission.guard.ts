import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { inject, injectable } from 'tsyringe';
import { ForbiddenError } from '../errors/AppError.js';
import { AuthorizationService } from './authorization.service.js';
import { Gate } from './gate.js';
import type { IAuthGuard } from './guards/i-auth.guard.js';

@injectable()
export class PermissionGuard {
    constructor(
        @inject('IAuthGuard') private readonly authGuard: IAuthGuard,
        @inject(AuthorizationService) private readonly authService: AuthorizationService,
        @inject(Gate) private readonly gate: Gate,
    ) {}

    public createMiddleware(permission: string): RequestHandler {
        return async (req: Request, res: Response, next: NextFunction) => {
            try {
                // Verify identity (this will throw if missing/invalid)
                await this.authGuard.verify(req, res, () => {});

                const user = (req as any).user;
                if (!user) {
                    throw new Error('User not attached by AuthGuard');
                }

                // Get permissions for user
                const permissions = await this.authService.getPermissions(user.id);
                user.permissions = permissions;

                // Step 1: Check if user actually has the permission in their set
                if (!permissions.includes(permission)) {
                    throw new ForbiddenError(`You do not have the required permission: ${permission}`);
                }

                // Step 2: For resource-scoped permissions, check Gate
                // Currently, we assume target ID is in req.params.id for :own style checks.
                const targetId = req.params.id;
                this.gate.authorize(permission, user, targetId);

                next();
            } catch (error) {
                next(error);
            }
        };
    }
}
