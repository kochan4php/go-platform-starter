/**
 * @description This file contain database configuration using Prisma
 * @author {Deo Sbrn}
 */

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { logger } from '../common/utils/logger.js';
import { DATABASE_URL } from '../config/env.js';

const pool = new Pool({
    connectionString: DATABASE_URL,
    max: process.env.DB_POOL_MAX ? parseInt(process.env.DB_POOL_MAX) : 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});
const adapter = new PrismaPg(pool);
export const prisma = new PrismaClient({ adapter });

export default async function database(retries = 30): Promise<void> {
    while (retries > 0) {
        try {
            await prisma.$connect();
            logger.info('Database', 'PostgreSQL Connected via Prisma');
            return;
        } catch (error: any) {
            retries -= 1;
            logger.error('Database', `Connection failed. Retries left: ${retries}. Error: ${error.message}`);
            if (retries === 0) {
                logger.error(
                    'Database',
                    'Could not connect to database after maximum retries. The server will continue running but database queries will fail.',
                );
                return;
            }
            await new Promise((res) => setTimeout(res, 2000));
        }
    }
}
