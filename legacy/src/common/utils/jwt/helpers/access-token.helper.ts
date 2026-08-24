import type { JwtPayload, SignOptions } from 'jsonwebtoken';
import { ACCESS_TOKEN_SECRET } from '../../../../config/env.js';
import { JwtHelper } from '../jwt.js';

export class AccessTokenHelper {
    public static generateAccessToken(payload: object | string = {}, expired: SignOptions['expiresIn'] = '10h'): string {
        return JwtHelper.generateToken(payload, ACCESS_TOKEN_SECRET, expired);
    }

    public static verifyAccessToken(token: string): Promise<object | string | undefined> {
        return JwtHelper.verifyToken(token, ACCESS_TOKEN_SECRET);
    }

    public static getUserPayloadFromAccessToken(token: string): JwtPayload | string | null {
        return JwtHelper.decodeToken(token);
    }
}
