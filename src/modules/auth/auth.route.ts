import { AuthController } from './auth.controller';
import { container } from '../../container';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { validate } from '../../common/middlewares/validate.middleware';
import { loginSchema, registerSchema } from './auth.dto';
import { rateLimit } from 'express-rate-limit';
import { authLimitterConfig } from '../../config/app';
import { BaseRoute } from '../../common/base.route';

import { injectable } from 'tsyringe';

@injectable()
export class AuthRoute extends BaseRoute {
    private authController: AuthController;
    private authGuard: any;

    constructor() {
        super('/api/auth');
        this.authController = container.resolve(AuthController);
        this.authGuard = container.resolve('IAuthGuard');
        this.initializeRoutes();
    }

    protected initializeRoutes(): void {
        const authLimiter = rateLimit(authLimitterConfig());

        this.post('/register', [authLimiter, validate(registerSchema)], this.authController, 'register');
        this.post('/login', [authLimiter, validate(loginSchema)], this.authController, 'login');
        this.get('/refresh-token', [], this.authController, 'refreshToken');
        this.delete('/logout', [], this.authController, 'logout');
    }
}
