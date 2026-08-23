import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { PostgreSqlContainer } from '@testcontainers/postgresql';

const handoffFile = `${tmpdir()}/express-ts-starter-vitest-db.json`;

/**
 * Starts one PostgreSQL container for the whole run and hands its URL to worker
 * processes via a JSON file (process.env does not cross the process boundary).
 */
export async function setup(): Promise<void> {
    const container = await new PostgreSqlContainer('postgres:15-alpine').start();
    const databaseUrl = `postgresql://${container.getUsername()}:${container.getPassword()}@${container.getHost()}:${container.getPort()}/${container.getDatabase()}`;
    writeFileSync(handoffFile, JSON.stringify({ databaseUrl }));

    // Stash handle for teardown
    process.env.__VITEST_PG_CONTAINER_ID = container.getId();
    globalThis.__vitestPgContainer = container;
}

export async function teardown(): Promise<void> {
    const container = (globalThis as any).__vitestPgContainer;
    if (container) await container.stop();
}
