import dotenv from 'dotenv';
import { defineConfig, env } from 'prisma/config';

dotenv.config({ path: `./env/.env.${process.env.NODE_ENV || 'local'}` });

export default defineConfig({
    schema: './prisma/schema.prisma',
    datasource: {
        url: process.env.DATABASE_URL || env('DATABASE_URL'),
    },
});
