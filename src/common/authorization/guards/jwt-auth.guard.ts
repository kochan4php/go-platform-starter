import { type NextFunction, Request, type Response } from 'express';
import { injectable } from 'tsyringe';
import { UnauthorizedError } from '../../errors/AppError.js';
import type IRequest from '../../types/i-request.js';
import { AccessTokenHelper } from '../../utils/jwt/helpers/access-token.helper.js';
import type { IAuthGuard } from './i-auth.guard.js';

@injectable()
export class JwtAuthGuard implements IAuthGuard {
    public async verify(req: IRequest, res: Response, next: NextFunction): Promise<void> {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            throw new UnauthorizedError('Token missing or invalid');
        }

        try {
            await AccessTokenHelper.verifyAccessToken(token);
            const decoded = AccessTokenHelper.getUserPayloadFromAccessToken(token) as any;

            req.user = decoded;
            next();
        } catch (error: any) {
            throw new UnauthorizedError('Token invalid or expired');
        }
    }
}
