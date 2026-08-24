import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';

/**
 * Runs before test modules load. Points the app at the testcontainer database.
 * Requires a single vitest fork so the container/migrations are shared, not raced.
 */
const { databaseUrl } = JSON.parse(readFileSync(`${tmpdir()}/express-ts-starter-vitest-db.json`, 'utf8'));
process.env.DATABASE_URL = databaseUrl;

// Keep rate limiting out of the way of e2e flows
process.env.AUTH_RATE_LIMIT_MAX = '10000';
process.env.LOG_LEVEL = 'silent';
process.env.RATE_LIMIT_MAX = '10000';

// Single-fork guarantee (see vitest.config.mts)
process.env.NODE_ENV = 'test';
