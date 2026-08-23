import type { JwtPayload, SignOptions } from 'jsonwebtoken';
import { REFRESH_TOKEN_SECRET } from '../../../../config/env.js';
import { JwtHelper } from '../jwt.js';

export class RefreshTokenHelper {
    public static generateRefreshToken(payload: object | string = {}, expired: SignOptions['expiresIn'] = '10h'): string {
        return JwtHelper.generateToken(payload, REFRESH_TOKEN_SECRET, expired);
    }

    public static verifyRefreshToken(token: string): Promise<object | string | undefined> {
        return JwtHelper.verifyToken(token, REFRESH_TOKEN_SECRET);
    }

    public static getUserPayloadFromRefreshToken(token: string): JwtPayload | string | null {
        return JwtHelper.decodeToken(token);
    }
}
