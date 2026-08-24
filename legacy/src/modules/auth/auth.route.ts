import { rateLimit } from 'express-rate-limit';
import { injectable } from 'tsyringe';
import { BaseRoute } from '../../common/base.route.js';
import { validate } from '../../common/middlewares/validate.middleware.js';
import { authLimiterConfig } from '../../config/app.js';
import { container } from '../../container.js';
import { openApiRegistry } from '../../openapi/registry.js';
import { AuthController } from './auth.controller.js';
import { forgotPasswordSchema, loginSchema, registerSchema, resetPasswordSchema } from './auth.dto.js';

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

        openApiRegistry.register({
            path: '/api/v1/auth/register',
            method: 'post',
            tag: 'Auth',
            summary: 'Register a new user',
            body: registerSchema.shape.body,
        });
        openApiRegistry.register({
            path: '/api/v1/auth/login',
            method: 'post',
            tag: 'Auth',
            summary: 'Login with email or phone',
            body: loginSchema.shape.body,
        });
        openApiRegistry.register({
            path: '/api/v1/auth/refresh-token',
            method: 'get',
            tag: 'Auth',
            summary: 'Rotate tokens using the httpOnly session cookie',
        });
        openApiRegistry.register({
            path: '/api/v1/auth/forgot-password',
            method: 'post',
            tag: 'Auth',
            summary: 'Request a password reset email (uniform response)',
            body: forgotPasswordSchema.shape.body,
        });
        openApiRegistry.register({
            path: '/api/v1/auth/reset-password',
            method: 'post',
            tag: 'Auth',
            summary: 'Reset the password with an emailed token; revokes all sessions',
            body: resetPasswordSchema.shape.body,
        });
        openApiRegistry.register({
            path: '/api/v1/auth/logout',
            method: 'delete',
            tag: 'Auth',
            summary: 'Revoke the current session',
        });

        this.post('/register', [authLimiter, validate(registerSchema)], this.authController, 'register');
        this.post('/login', [authLimiter, validate(loginSchema)], this.authController, 'login');
        this.get('/refresh-token', [], this.authController, 'refreshToken');
        this.post('/forgot-password', [authLimiter, validate(forgotPasswordSchema)], this.authController, 'forgotPassword');
        this.post('/reset-password', [authLimiter, validate(resetPasswordSchema)], this.authController, 'resetPassword');
        this.delete('/logout', [], this.authController, 'logout');
    }
}
