import type { SignOptions } from 'jsonwebtoken';
import {
    ACCESS_TOKEN_TTL as ACCESS_TOKEN_TTL_RAW,
    REFRESH_TOKEN_TTL_DAYS,
    SESSION_COOKIE_NAME,
    SESSION_COOKIE_SAMESITE,
    SESSION_COOKIE_SECURE,
} from './env.js';

/**
 * @description Derived auth/session configuration. Raw values are validated in
 * config/env.ts — this module only derives jsonwebtoken/express-cookie shapes.
 */
export const ACCESS_TOKEN_TTL = ACCESS_TOKEN_TTL_RAW as NonNullable<SignOptions['expiresIn']>;
export { SESSION_COOKIE_NAME, SESSION_COOKIE_SAMESITE, SESSION_COOKIE_SECURE };

export const REFRESH_TOKEN_TTL = `${REFRESH_TOKEN_TTL_DAYS}d` as NonNullable<SignOptions['expiresIn']>;

/** Refresh/session lifetime in milliseconds (drives cookie maxAge and session rows). */
export const sessionCookieMaxAge = (): number => REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;
