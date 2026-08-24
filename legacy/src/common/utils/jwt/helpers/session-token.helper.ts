import type { JwtPayload, SignOptions } from 'jsonwebtoken';
import { SESSION_TOKEN_SECRET } from '../../../../config/env.js';
import { JwtHelper } from '../jwt.js';

export class SessionTokenHelper {
    public static generateSessionToken(payload: object | string = {}, expired: SignOptions['expiresIn']): string {
        return JwtHelper.generateToken(payload, SESSION_TOKEN_SECRET, expired);
    }

    public static verifySessionToken(token: string): Promise<object | string | undefined> {
        return JwtHelper.verifyToken(token, SESSION_TOKEN_SECRET);
    }

    public static getSessionPayload(token: string): JwtPayload | null | any {
        return JwtHelper.decodeToken(token);
    }

    public static getSessionId(token: string): string | null {
        return SessionTokenHelper.getSessionPayload(token)?.sessionId;
    }
}
