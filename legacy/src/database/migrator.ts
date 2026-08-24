import type { QueryInterface, Sequelize } from 'sequelize';
import { SequelizeStorage, Umzug } from 'umzug';
import { sequelize } from './connection.js';
import * as migration001 from './migrations/001-init.js';
import * as migration002 from './migrations/002-auth-hardening.js';

/**
 * Explicit migration registry: add new migrations here in order.
 * Avoids ESM glob/path resolution issues between tsx (dev) and tsc dist (prod).
 */
const migrations = [
    {
        name: '001-init',
        up: async ({ context }: { context: { queryInterface: QueryInterface } }) => migration001.up(context.queryInterface),
        down: async ({ context }: { context: { queryInterface: QueryInterface } }) => migration001.down(context.queryInterface),
    },
    {
        name: '002-auth-hardening',
        up: async ({ context }: { context: { queryInterface: QueryInterface } }) => migration002.up(context.queryInterface),
        down: async ({ context }: { context: { queryInterface: QueryInterface } }) => migration002.down(context.queryInterface),
    },
];

export const migrator = new Umzug({
    migrations,
    context: { queryInterface: sequelize.getQueryInterface(), sequelize: sequelize as unknown as Sequelize },
    storage: new SequelizeStorage({ sequelize }),
    logger: console,
});

export type Migrator = typeof migrator;
