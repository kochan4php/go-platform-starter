import { Sequelize } from 'sequelize-typescript';
import { DATABASE_URL, DB_POOL_MAX } from '../config/env.js';
import { Permission } from './models/permission.model.js';
import { Role } from './models/role.model.js';
import { RolePermission } from './models/role-permission.model.js';
import { Session } from './models/session.model.js';
import { User } from './models/user.model.js';
import { UserRole } from './models/user-role.model.js';

export const sequelize = new Sequelize(DATABASE_URL, {
    dialect: 'postgres',
    logging: false,
    pool: { max: DB_POOL_MAX },
    models: [User, Role, Permission, RolePermission, UserRole, Session],
});

/**
 * @description Verify the database connection with retries. Throws after exhausting
 * retries so the process can exit and the orchestrator restart policy takes over.
 */
export async function connectDatabase(retries = 30, delayMs = 2000): Promise<void> {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            await sequelize.authenticate();
            return;
        } catch (error: any) {
            const isLast = attempt === retries;
            console.error(`[Database] Connection attempt ${attempt}/${retries} failed: ${error.message}`);
            if (isLast) throw error;
            await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
    }
}

export async function closeDatabase(): Promise<void> {
    await sequelize.close();
}
