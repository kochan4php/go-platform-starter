/**
 * @description This script will create some .env files in the env folder based on the .env.example file in the root project.
 * @author {Deo Sbrn}
 */

import { existsSync, mkdirSync, readFileSync } from 'fs';
import { writeFile } from 'fs/promises';

const envExample = readFileSync('./env/.env.example', 'utf8');
const environments = ['local', 'testing', 'development', 'staging', 'production', 'production.local'];

if (!existsSync('./env')) mkdirSync('./env');

for (const environment of environments) {
    try {
        await writeFile(`./env/.env.${environment}`, envExample);
        console.log(`.env.${environment} file created successfully! ✅`);
    } catch {
        console.log('Something went wrong. ❌');
        process.exit(1);
    }
}
