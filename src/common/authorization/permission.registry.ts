import { injectable } from 'tsyringe';
import { prisma } from '../../database/connection.js';
import { logger } from '../utils/logger.js';

@injectable()
export class PermissionRegistry {
    private permissions: Set<string> = new Set();

    public async loadPermissions(): Promise<void> {
        try {
            const perms = await prisma.permission.findMany({ select: { name: true } });
            this.permissions = new Set(perms.map((p) => p.name));
            logger.info('PermissionRegistry', `Loaded ${this.permissions.size} permissions from database.`);
        } catch (error: any) {
            logger.error('PermissionRegistry', `Failed to load permissions: ${error.message}`);
            throw error;
        }
    }

    public isValid(permission: string): boolean {
        return this.permissions.has(permission);
    }
}
