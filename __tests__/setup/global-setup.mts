import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';

const handoffFile = `${tmpdir()}/express-ts-starter-vitest-db.json`;

/**
 * Starts one PostgreSQL container for the whole run, hands its URL to worker
 * processes via a JSON file (process.env does not cross the process boundary),
 * then applies migrations + seed exactly once so spec files never race on schema.
 * Requires a single vitest fork (see vitest.config.mts).
 */
export async function setup(): Promise<void> {
    const container = await new PostgreSqlContainer('postgres:15-alpine').start();
    const databaseUrl = `postgresql://${container.getUsername()}:${container.getPassword()}@${container.getHost()}:${container.getPort()}/${container.getDatabase()}`;
    writeFileSync(handoffFile, JSON.stringify({ databaseUrl }));

    process.env.DATABASE_URL = databaseUrl;
    process.env.NODE_ENV = 'test';

    const { connectDatabase, closeDatabase } = await import('../../src/database/connection.js');
    const { migrator } = await import('../../src/database/migrator.js');
    const { seed } = await import('../../src/database/seeders/index.js');

    await connectDatabase(5, 2000);
    await migrator.up();
    await seed();
    await closeDatabase();

    globalThis.__vitestPgContainer = container;
}

export async function teardown(): Promise<void> {
    const container = (globalThis as any).__vitestPgContainer;
    if (container) await container.stop();
}
