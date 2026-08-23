import { closeDatabase, connectDatabase } from '../connection.js';
import { migrator } from '../migrator.js';
import { seed } from '../seeders/index.js';

const command = process.argv[2] ?? 'up';

try {
    await connectDatabase(3, 1000);
    if (command === 'up') {
        await migrator.up();
        await seed();
        console.log('[db] migrations applied and database seeded');
    } else if (command === 'undo') {
        await migrator.down();
        console.log('[db] last migration reverted');
    } else {
        console.error(`[db] unknown command '${command}' (use: up | undo)`);
        process.exitCode = 1;
    }
} catch (error: any) {
    console.error(`[db] failed: ${error.message}`);
    process.exitCode = 1;
} finally {
    await closeDatabase();
}
