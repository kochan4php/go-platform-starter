/**
 * @description Typed, validated environment configuration.
 * Every environment variable is declared here exactly once and parsed through a zod
 * schema at boot. Missing or invalid values kill the process immediately with a
 * readable report — misconfiguration must never surface as a runtime surprise.
 *
 * This is the ONLY file in src/ allowed to read process.env directly.
 * @author {Deo Sbrn}
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// dotenv bootstrap (before schema parsing)
// ---------------------------------------------------------------------------

import dotenv from 'dotenv';

const NODE_ENV = process.env.NODE_ENV || 'local';
dotenv.config({ path: `./env/.env.${NODE_ENV}` });

// ---------------------------------------------------------------------------
// Schema — every variable declared exactly once
// ---------------------------------------------------------------------------

const DURATION = /^[1-9]\d*(s|m|h|d)$/;

const envSchema = z.object({
    // App
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
    TRUSTED_DOMAINS: z
        .string()
        .optional()
        .transform((value) =>
            (value ?? '')
                .split(',')
                .map((domain) => domain.trim())
                .filter(Boolean),
        ),

    // Database
    DATABASE_URL: z.string().min(1),
    DB_POOL_MAX: z.coerce.number().int().min(1).max(1000).default(20),

    // JWT secrets (length floor keeps example-grade values honest)
    ACCESS_TOKEN_SECRET: z.string().min(16),
    REFRESH_TOKEN_SECRET: z.string().min(16),
    SESSION_TOKEN_SECRET: z.string().min(16),

    // Token lifetimes & session cookie
    ACCESS_TOKEN_TTL: z.string().regex(DURATION).default('5h'),
    REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(365).default(5),
    SESSION_COOKIE_NAME: z.string().min(1).default('session-backend'),
    SESSION_COOKIE_SECURE: z
        .enum(['true', 'false'])
        .default('false')
        .transform((value) => value === 'true'),
    SESSION_COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).default('lax'),

    // Rate limiting
    RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1000).default(900_000),
    RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(100),
    AUTH_RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(10),

    // Login lockout
    LOGIN_MAX_ATTEMPTS: z.coerce.number().int().min(1).default(5),
    LOGIN_LOCK_MINUTES: z.coerce.number().int().min(1).default(15),

    // Mailer
    MAILER_DRIVER: z.enum(['console', 'smtp']).default('console'),
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    SMTP_FROM: z.string().default('noreply@example.local'),

    // Bootstrap admin
    ADMIN_BOOTSTRAP_PASSWORD: z.string().optional(),
});

export type AppEnv = z.infer<typeof envSchema>;

export type EnvParseResult = { success: true; data: AppEnv } | { success: false; error: string };

/** Pure parse — exported for tests; never exits. */
export function parseEnv(raw: Record<string, string | undefined>): EnvParseResult {
    const result = envSchema.safeParse(raw);
    if (result.success) {
        return { success: true, data: result.data };
    }

    const lines = result.error.issues.map((issue) => {
        const name = issue.path.join('.') || '(root)';
        return `  - ${name}: ${issue.message}`;
    });
    return {
        success: false,
        error: [`Invalid environment configuration:`, ...lines, `Fix env/.env.${NODE_ENV} and restart.`].join('\n'),
    };
}

// ---------------------------------------------------------------------------
// Module-level parse + exports (the only exit() in config)
// ---------------------------------------------------------------------------

const parsed = parseEnv(process.env);

if (!parsed.success) {
    console.error(`[env] ${parsed.error}`);
    process.exit(1);
}

const ENV = parsed.data;

// --- App ---
export const PORT = ENV.PORT;
export const LOG_LEVEL = ENV.LOG_LEVEL;
export const TRUSTED_DOMAINS = ENV.TRUSTED_DOMAINS;

// --- Database ---
export const DATABASE_URL = ENV.DATABASE_URL;
export const DB_POOL_MAX = ENV.DB_POOL_MAX;

// --- JWT secrets ---
export const ACCESS_TOKEN_SECRET = ENV.ACCESS_TOKEN_SECRET;
export const REFRESH_TOKEN_SECRET = ENV.REFRESH_TOKEN_SECRET;
export const SESSION_TOKEN_SECRET = ENV.SESSION_TOKEN_SECRET;

// --- Token lifetimes & session cookie ---
export const ACCESS_TOKEN_TTL = ENV.ACCESS_TOKEN_TTL;
export const REFRESH_TOKEN_TTL_DAYS = ENV.REFRESH_TOKEN_TTL_DAYS;
export const SESSION_COOKIE_NAME = ENV.SESSION_COOKIE_NAME;
export const SESSION_COOKIE_SECURE = ENV.SESSION_COOKIE_SECURE;
export const SESSION_COOKIE_SAMESITE = ENV.SESSION_COOKIE_SAMESITE;

// --- Rate limiting ---
export const RATE_LIMIT_WINDOW_MS = ENV.RATE_LIMIT_WINDOW_MS;
export const RATE_LIMIT_MAX = ENV.RATE_LIMIT_MAX;
export const AUTH_RATE_LIMIT_MAX = ENV.AUTH_RATE_LIMIT_MAX;

// --- Login lockout ---
export const LOGIN_MAX_ATTEMPTS = ENV.LOGIN_MAX_ATTEMPTS;
export const LOGIN_LOCK_MINUTES = ENV.LOGIN_LOCK_MINUTES;

// --- Mailer ---
export const MAILER_DRIVER = ENV.MAILER_DRIVER;
export const SMTP_HOST = ENV.SMTP_HOST;
export const SMTP_PORT = ENV.SMTP_PORT;
export const SMTP_USER = ENV.SMTP_USER;
export const SMTP_PASS = ENV.SMTP_PASS;
export const SMTP_FROM = ENV.SMTP_FROM;

// --- Bootstrap admin ---
export const ADMIN_BOOTSTRAP_PASSWORD = ENV.ADMIN_BOOTSTRAP_PASSWORD;
