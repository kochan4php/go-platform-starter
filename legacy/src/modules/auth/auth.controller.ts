import type { Request, Response } from 'express';
import { Op } from 'sequelize';
import { inject, injectable } from 'tsyringe';
import type { IMailer } from '../../common/mailer/index.js';
import { Public } from '../../common/rbac/decorators.js';
import { resFailed, resSuccess } from '../../common/response.js';
import { HashHelper } from '../../common/utils/hash.helper.js';
import { AccessTokenHelper } from '../../common/utils/jwt/helpers/access-token.helper.js';
import { RefreshTokenHelper } from '../../common/utils/jwt/helpers/refresh-token.helper.js';
import { SessionTokenHelper } from '../../common/utils/jwt/helpers/session-token.helper.js';
import { logger } from '../../common/utils/logger.js';
import {
    ACCESS_TOKEN_TTL,
    REFRESH_TOKEN_TTL,
    SESSION_COOKIE_NAME,
    SESSION_COOKIE_SAMESITE,
    SESSION_COOKIE_SECURE,
    sessionCookieMaxAge,
} from '../../config/auth.js';
import { LOGIN_LOCK_MINUTES, LOGIN_MAX_ATTEMPTS } from '../../config/env.js';
import { UserService } from '../users/users.service.js';
import { PasswordResetService } from './password-reset.service.js';
import { SessionService } from './session.service.js';

@injectable()
export class AuthController {
    constructor(
        @inject(UserService) private readonly userService: UserService,
        @inject(SessionService) private readonly sessionService: SessionService,
        @inject('IMailer') private readonly mailer: IMailer,
        @inject(PasswordResetService) private readonly passwordResetService: PasswordResetService,
    ) {}

    private setSessionCookie(res: Response, encryptedSessionId: string): void {
        res.cookie(SESSION_COOKIE_NAME, encryptedSessionId, {
            httpOnly: true,
            secure: SESSION_COOKIE_SECURE,
            sameSite: SESSION_COOKIE_SAMESITE,
            maxAge: sessionCookieMaxAge(),
        });
    }

    private clearSessionCookie(res: Response): void {
        res.clearCookie(SESSION_COOKIE_NAME);
    }

    @Public()
    public async register(req: Request, res: Response): Promise<Response> {
        try {
            const { name, phoneNumber, email, password } = req.body;
            const existing = await this.userService.getOneUser({ email });
            if (existing) {
                return resFailed(res, 409, 'Email already registered');
            }

            const user = await this.userService.createUser({ name, phoneNumber, email, password });
            return resSuccess(res, 201, 'Register success', { user });
        } catch (error: any) {
            logger.error({ err: error }, 'AuthController.register failed');
            return resFailed(res, 500, 'Internal Server Error');
        }
    }

    @Public()
    public async login(req: Request, res: Response): Promise<Response> {
        try {
            const { loginType, password } = req.body;
            const user = await this.userService.getOneUser({ [Op.or]: [{ email: loginType }, { phoneNumber: loginType }] });

            // Uniform 401 for unknown identity, wrong password AND locked account
            // (nothing is revealed to the caller in any of the three cases).
            const invalid = () => resFailed(res, 401, 'Invalid credentials');
            if (!user) return invalid();

            if (user.lockedUntil && user.lockedUntil > new Date()) return invalid();

            if (!(await HashHelper.compare(password, user.password))) {
                const attempts = user.failedLoginAttempts + 1;
                if (attempts >= LOGIN_MAX_ATTEMPTS) {
                    user.failedLoginAttempts = 0;
                    user.lockedUntil = new Date(Date.now() + LOGIN_LOCK_MINUTES * 60 * 1000);
                } else {
                    user.failedLoginAttempts = attempts;
                }
                await user.save();
                return invalid();
            }

            if (user.failedLoginAttempts > 0 || user.lockedUntil) {
                user.failedLoginAttempts = 0;
                user.lockedUntil = null;
                await user.save();
            }

            const jwtPayload = { id: user.id, email: user.email };
            const accessToken = AccessTokenHelper.generateAccessToken(jwtPayload, ACCESS_TOKEN_TTL);
            const refreshToken = RefreshTokenHelper.generateRefreshToken(jwtPayload, REFRESH_TOKEN_TTL);

            const expiresAt = new Date(Date.now() + sessionCookieMaxAge());
            const session = await this.sessionService.createSession({ refreshToken, userId: user.id, expiresAt });

            this.setSessionCookie(res, SessionTokenHelper.generateSessionToken({ sessionId: session.id }, REFRESH_TOKEN_TTL));

            return resSuccess(res, 200, 'Login success', { accessToken, refreshToken });
        } catch (error: any) {
            logger.error({ err: error }, 'AuthController.login failed');
            return resFailed(res, 500, 'Internal Server Error');
        }
    }

    @Public()
    public async forgotPassword(req: Request, res: Response): Promise<Response> {
        try {
            const { email } = req.body;
            const user = await this.userService.getOneUser({ email });

            if (user) {
                const token = this.passwordResetService.createToken(user.id);
                await this.mailer.send({
                    to: email,
                    subject: 'Reset your password',
                    html: `<p>Hello ${user.name},</p><p>Your password reset token (valid 15 minutes):</p><p><code>${token}</code></p>`,
                });
            }

            // Always the same answer — never reveal whether the account exists.
            return resSuccess(res, 200, 'If that email exists, a reset link has been sent');
        } catch (error: any) {
            logger.error({ err: error }, 'AuthController.forgotPassword failed');
            return resFailed(res, 500, 'Internal Server Error');
        }
    }

    @Public()
    public async resetPassword(req: Request, res: Response): Promise<Response> {
        try {
            const { token, password } = req.body;
            const userId = await this.passwordResetService.consume(token);
            if (!userId) {
                return resFailed(res, 400, 'Invalid or expired reset token');
            }

            const updated = await this.userService.changeUserPassword(userId, password);
            if (!updated) {
                return resFailed(res, 400, 'Invalid or expired reset token');
            }

            // Any stolen refresh token dies here: wipe every session of the user.
            await this.sessionService.revokeAllForUser(userId);
            this.clearSessionCookie(res);

            return resSuccess(res, 200, 'Password has been reset. Please login again.');
        } catch (error: any) {
            logger.error({ err: error }, 'AuthController.resetPassword failed');
            return resFailed(res, 500, 'Internal Server Error');
        }
    }

    @Public()
    public async refreshToken(req: Request, res: Response): Promise<Response> {
        try {
            const tokenSessionId = req.cookies[SESSION_COOKIE_NAME];
            if (!tokenSessionId) {
                return resFailed(res, 401, 'Session not found');
            }

            try {
                await SessionTokenHelper.verifySessionToken(tokenSessionId);
            } catch {
                res.clearCookie(SESSION_COOKIE_NAME);
                return resFailed(res, 401, 'Session not valid, please login again');
            }

            const sessionId = SessionTokenHelper.getSessionId(tokenSessionId) as string;
            const session = await this.sessionService.getOneSessionById(sessionId);
            if (!session) {
                res.clearCookie(SESSION_COOKIE_NAME);
                return resFailed(res, 401, 'Session not found');
            }

            try {
                await RefreshTokenHelper.verifyRefreshToken(session.refreshToken as string);
            } catch {
                await this.sessionService.revokeSession(session.id);
                res.clearCookie(SESSION_COOKIE_NAME);
                return resFailed(res, 401, 'Your session is expired, please login again');
            }

            const user = await this.userService.getOneUserById(session.userId);
            if (!user) {
                return resFailed(res, 404, 'User not found');
            }

            const jwtPayload = { id: user.id, email: user.email };
            const accessToken = AccessTokenHelper.generateAccessToken(jwtPayload, ACCESS_TOKEN_TTL);
            const refreshToken = RefreshTokenHelper.generateRefreshToken(jwtPayload, REFRESH_TOKEN_TTL);

            await this.sessionService.updateOneSessionById(session.id, { refreshToken });
            this.setSessionCookie(res, SessionTokenHelper.generateSessionToken({ sessionId: session.id }, REFRESH_TOKEN_TTL));

            return resSuccess(res, 200, 'Refresh token success', { accessToken, refreshToken });
        } catch (error: any) {
            logger.error({ err: error }, 'AuthController.refreshToken failed');
            return resFailed(res, 500, 'Internal Server Error');
        }
    }

    @Public()
    public async logout(req: Request, res: Response): Promise<Response> {
        try {
            const tokenSessionId = req.cookies[SESSION_COOKIE_NAME];
            if (!tokenSessionId) {
                return resFailed(res, 401, 'Session not found');
            }

            try {
                await SessionTokenHelper.verifySessionToken(tokenSessionId);
            } catch {
                return resFailed(res, 401, 'Session not valid');
            }

            const sessionId = SessionTokenHelper.getSessionId(tokenSessionId) as string;
            const session = await this.sessionService.getOneSessionById(sessionId);
            if (!session) {
                res.clearCookie(SESSION_COOKIE_NAME);
                return resFailed(res, 401, 'Session not found');
            }

            try {
                await RefreshTokenHelper.verifyRefreshToken(session.refreshToken as string);
            } catch {
                res.clearCookie(SESSION_COOKIE_NAME);
                return resFailed(res, 401, 'Refresh token not valid');
            }

            await this.sessionService.deleteOneSessionById(session.id);
            res.clearCookie(SESSION_COOKIE_NAME);

            return resSuccess(res, 200, 'Logout success');
        } catch (error: any) {
            logger.error({ err: error }, 'AuthController.logout failed');
            return resFailed(res, 500, 'Internal Server Error');
        }
    }
}
