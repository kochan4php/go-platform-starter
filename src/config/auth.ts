import type { SignOptions } from 'jsonwebtoken';

/**
 * @description Auth/session runtime configuration, all overridable via env.
 */
export const ACCESS_TOKEN_TTL = (process.env.ACCESS_TOKEN_TTL || '5h') as NonNullable<SignOptions['expiresIn']>;
export const REFRESH_TOKEN_TTL_DAYS = Number(process.env.REFRESH_TOKEN_TTL_DAYS) || 5;
export const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'session-backend';
export const SESSION_COOKIE_SECURE = process.env.SESSION_COOKIE_SECURE === 'true';
export const SESSION_COOKIE_SAMESITE = (process.env.SESSION_COOKIE_SAMESITE as 'lax' | 'strict' | 'none') || 'lax';

/** Refresh/session lifetime expressed as a jsonwebtoken-compatible duration string, e.g. "5d". */
export const REFRESH_TOKEN_TTL = `${REFRESH_TOKEN_TTL_DAYS}d` as NonNullable<SignOptions['expiresIn']>;

export const sessionCookieMaxAge = (): number => REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;
