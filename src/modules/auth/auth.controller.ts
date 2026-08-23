import { Request, Response } from 'express';
import { AccessTokenHelper } from '../../common/utils/jwt/helpers/access-token.helper';
import { RefreshTokenHelper } from '../../common/utils/jwt/helpers/refresh-token.helper';
import { SessionTokenHelper } from '../../common/utils/jwt/helpers/session-token.helper';
import { resFailed, resSuccess } from '../../common/response/index';
import { HashHelper } from '../../common/utils/hash.helper';
import { SessionService } from './session.service';
import { UserService } from '../users/users.service';
import { logger } from '../../common/utils/logger';

import { injectable, inject } from 'tsyringe';
import { Public } from '../../common/authorization/decorators';

@injectable()
export class AuthController {
    constructor(
        @inject(UserService) private readonly userService: UserService,
        @inject(SessionService) private readonly sessionService: SessionService
    ) {}

    @Public()
    public async register(req: Request, res: Response): Promise<Response> {
        try {
            const { name, phoneNumber, email, password } = req.body;
            const user = await this.userService.getOneUser({ email });

            if (user) {
                const message = 'Email already registered';
                return resFailed(res, 400, message);
            }

            const hashPassword = await HashHelper.hash(password);
            const data = { name, phoneNumber, email, password: hashPassword };
            const newUser = await this.userService.createUser(data);
            const getNewUserWithoutPassword = await this.userService.getOneUser({ email: newUser.email });

            const message = 'Register success';
            return resSuccess(res, 201, message, { user: getNewUserWithoutPassword });
        } catch (error: any) {
            logger.error('AuthController.register', error.message);
            return resFailed(res, 500, error.message);
        }
    }

    @Public()
    public async login(req: Request, res: Response): Promise<Response> {
        try {
            const { loginType, password } = req.body;
            const filter = { OR: [{ email: loginType }, { phoneNumber: loginType }] };
            const user = await this.userService.getOneUser(filter, {}, false);

            if (!user) {
                const message = 'User not found';
                return resFailed(res, 404, message);
            }

            const isPasswordMatch = await HashHelper.compare(password, user.password);

            if (!isPasswordMatch) {
                const message = 'Password is incorrect';
                return resFailed(res, 400, message);
            }

            const JWTPayload = { id: user.id, email: user.email };
            const accessToken = AccessTokenHelper.generateAccessToken(JWTPayload, '5h');
            const refreshToken = RefreshTokenHelper.generateRefreshToken(JWTPayload, '5d');

            const date = new Date();
            const sessionObj = { refreshToken, userId: user.id, expiresAt: new Date(date.setDate(date.getDate() + 5)) };
            const newSession = await this.sessionService.createSession(sessionObj);

            const encryptSessionId = SessionTokenHelper.generateSessionToken({ sessionId: newSession.id }, '5d');

            res.cookie('session-backend', encryptSessionId, {
                httpOnly: true,
                maxAge: 5 * 24 * 60 * 60 * 1000,
            });

            const message = 'Login success';
            return resSuccess(res, 200, message, { accessToken, refreshToken });
        } catch (error: any) {
            logger.error('AuthController.login', error.message);
            return resFailed(res, 500, error.message);
        }
    }

    @Public()
    public async refreshToken(req: Request, res: Response): Promise<Response> {
        try {
            const tokenSessionId = req.cookies['session-backend'];

            if (!tokenSessionId) {
                const message = 'Session not found';
                return resFailed(res, 404, message);
            }

            const sessionId = SessionTokenHelper.getSessionId(tokenSessionId);

            const existsSession = await this.sessionService.getOneSessionById(sessionId as string);

            if (!existsSession) {
                const message = 'Session not found';
                return resFailed(res, 404, message);
            }

            try {
                await SessionTokenHelper.verifySessionToken(tokenSessionId);
            } catch (error: any) {
                res.clearCookie('session-backend');
                this.sessionService.revokeSession(existsSession.id);

                const message = 'Session not valid, please login again';
                return resFailed(res, 403, message);
            }

            try {
                await RefreshTokenHelper.verifyRefreshToken(existsSession.refreshToken as string);
            } catch (error: any) {
                res.clearCookie('session-backend');
                this.sessionService.revokeSession(existsSession.id);

                const message = 'Your session is expired';
                return resFailed(res, 403, message);
            }

            const user = await this.userService.getOneUser({ id: existsSession.userId });

            if (!user) {
                const message = 'User not found';
                return resFailed(res, 404, message);
            }

            const JWTPayload = { id: user.id, email: user.email };
            const accessToken = AccessTokenHelper.generateAccessToken(JWTPayload, '5h');
            const refreshToken = RefreshTokenHelper.generateRefreshToken(JWTPayload, '5d');

            const newSession = await this.sessionService.updateOneSessionById(existsSession.id, { refreshToken });
            const encryptSessionId = SessionTokenHelper.generateSessionToken({ sessionId: newSession?.id }, '5d');

            res.clearCookie('session-backend');
            res.cookie('session-backend', encryptSessionId, {
                httpOnly: true,
                maxAge: 5 * 24 * 60 * 60 * 1000,
            });

            const message = 'Refresh the token success';
            return resSuccess(res, 200, message, { accessToken, refreshToken });
        } catch (error: any) {
            logger.error('AuthController.refreshToken', error.message);
            return resFailed(res, 500, error.message);
        }
    }

    @Public()
    public async logout(req: Request, res: Response): Promise<Response> {
        try {
            const tokenSessionId = req.cookies['session-backend'];

            if (!tokenSessionId) {
                const message = 'Session not found';
                return resFailed(res, 404, message);
            }

            try {
                await SessionTokenHelper.verifySessionToken(tokenSessionId);
            } catch (error: any) {
                const message = 'Session not valid';
                return resFailed(res, 403, message);
            }

            const sessionId = SessionTokenHelper.getSessionId(tokenSessionId);
            const existsSession = await this.sessionService.getOneSessionById(sessionId as string);

            if (!existsSession) {
                const message = 'Session not found';
                return resFailed(res, 404, message);
            }

            try {
                await RefreshTokenHelper.verifyRefreshToken(existsSession.refreshToken as string);
            } catch (error: any) {
                const message = 'Refresh token not valid';
                return resFailed(res, 403, message);
            }

            const user = await this.userService.getOneUser({ id: existsSession.userId });

            if (!user) {
                const message = 'User not found';
                return resFailed(res, 404, message);
            }

            await this.sessionService.deleteOneSessionById(existsSession.id);

            res.clearCookie('session-backend');

            const message = 'Logout success';
            return resSuccess(res, 200, message);
        } catch (error: any) {
            logger.error('AuthController.logout', error.message);
            return resFailed(res, 500, error.message);
        }
    }
}
