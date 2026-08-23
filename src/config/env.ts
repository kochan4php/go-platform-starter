/**
 * @description This file contain all environment variables
 * @author {Deo Sbrn}
 */

import dotenv from 'dotenv';

dotenv.config({ path: `./env/.env.${process.env.NODE_ENV}` });

export const PORT = Number(process.env.PORT) || 3000;
export const DATABASE_URL = process.env.DATABASE_URL as string;
export const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET as string;
export const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET as string;
export const SESSION_TOKEN_SECRET = process.env.SESSION_TOKEN_SECRET as string;
export const TRUSTED_DOMAINS = (process.env.TRUSTED_DOMAINS || '')
    .split(',')
    .map((domain) => domain.trim())
    .filter(Boolean);
