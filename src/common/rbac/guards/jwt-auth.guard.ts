import type { NextFunction, Response } from 'express';
import { injectable } from 'tsyringe';
import { UnauthorizedError } from '../../errors/AppError.js';
import type IRequest from '../../types/i-request.js';
import { AccessTokenHelper } from '../../utils/jwt/helpers/access-token.helper.js';
import type { IAuthGuard } from './i-auth.guard.js';

@injectable()
export class JwtAuthGuard implements IAuthGuard {
    public async verify(req: IRequest, _: Response, next: NextFunction): Promise<void> {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            throw new UnauthorizedError('Authorization token is missing');
        }

        try {
            await AccessTokenHelper.verifyAccessToken(token);
            const decoded = AccessTokenHelper.getUserPayloadFromAccessToken(token) as IRequest['user'];
            req.user = decoded;
            next();
        } catch {
            throw new UnauthorizedError('Token invalid or expired');
        }
    }
}
