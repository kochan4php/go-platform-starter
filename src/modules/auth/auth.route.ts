import { rateLimit } from 'express-rate-limit';
import { injectable } from 'tsyringe';
import { BaseRoute } from '../../common/base.route.js';
import { validate } from '../../common/middlewares/validate.middleware.js';
import { authLimiterConfig } from '../../config/app.js';
import { container } from '../../container.js';
import { AuthController } from './auth.controller.js';
import { loginSchema, registerSchema } from './auth.dto.js';

@injectable()
export class AuthRoute extends BaseRoute {
    private authController: AuthController;

    constructor() {
        super('/api/v1/auth');
        this.authController = container.resolve(AuthController);
        this.initializeRoutes();
    }

    protected initializeRoutes(): void {
        const authLimiter = rateLimit(authLimiterConfig());

        this.post('/register', [authLimiter, validate(registerSchema)], this.authController, 'register');
        this.post('/login', [authLimiter, validate(loginSchema)], this.authController, 'login');
        this.get('/refresh-token', [], this.authController, 'refreshToken');
        this.delete('/logout', [], this.authController, 'logout');
    }
}
