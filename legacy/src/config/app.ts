/**
 * @description This file contain all application configurations
 * @author {Deo Sbrn}
 */

import type { CorsOptions } from 'cors';
import type { Options } from 'express-rate-limit';
import type { ServerOptions } from 'socket.io';
import { AUTH_RATE_LIMIT_MAX, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS, TRUSTED_DOMAINS } from './env.js';

export const socketConfig = (): Partial<ServerOptions> => ({
    cors: {
        origin: TRUSTED_DOMAINS,
        methods: ['GET', 'POST'],
        credentials: true,
    },
});

export const corsConfig = (): CorsOptions => ({
    origin: TRUSTED_DOMAINS,
    credentials: true,
});

export const globalLimiterConfig = (): Partial<Options> => ({
    windowMs: RATE_LIMIT_WINDOW_MS,
    max: RATE_LIMIT_MAX,
    standardHeaders: 'draft-7',
    legacyHeaders: true,
    statusCode: 429,
    message: 'Too many requests, please try again later.',
});

export const authLimiterConfig = (): Partial<Options> => ({
    windowMs: RATE_LIMIT_WINDOW_MS,
    max: AUTH_RATE_LIMIT_MAX,
    standardHeaders: 'draft-7',
    legacyHeaders: true,
    statusCode: 429,
    message: 'Too many authentication attempts, please try again later.',
});
