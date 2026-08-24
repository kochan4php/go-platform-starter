import { randomUUID } from 'node:crypto';
import type { JwtPayload, SignOptions } from 'jsonwebtoken';
import { REFRESH_TOKEN_SECRET } from '../../../../config/env.js';
import { JwtHelper } from '../jwt.js';

export class RefreshTokenHelper {
    public static generateRefreshToken(payload: object | string = {}, expired: SignOptions['expiresIn'] = '10h'): string {
        // jti guarantees each issued refresh token is unique (rotation safety)
        const body = typeof payload === 'object' ? { ...payload, jti: randomUUID() } : payload;
        return JwtHelper.generateToken(body, REFRESH_TOKEN_SECRET, expired);
    }

    public static verifyRefreshToken(token: string): Promise<object | string | undefined> {
        return JwtHelper.verifyToken(token, REFRESH_TOKEN_SECRET);
    }

    public static getUserPayloadFromRefreshToken(token: string): JwtPayload | string | null {
        return JwtHelper.decodeToken(token);
    }
}
