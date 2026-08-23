/**
 * @description This file contain all application configurations
 * @author {Deo Sbrn}
 */

import type { CorsOptions } from 'cors';
import type { Options } from 'express-rate-limit';
import type { ServerOptions } from 'socket.io';
import { TRUSTED_DOMAINS } from '../config/env.js';

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

const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000;
const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX) || 100;
const AUTH_RATE_LIMIT_MAX = Number(process.env.AUTH_RATE_LIMIT_MAX) || 10;

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
