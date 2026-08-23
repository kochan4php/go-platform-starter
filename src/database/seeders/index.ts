import { PERMISSIONS } from '../../common/rbac/permission.catalog.js';
import { Permission } from '../models/permission.model.js';
import { Role } from '../models/role.model.js';
import { RolePermission } from '../models/role-permission.model.js';

/**
 * @description Idempotent seeder: ensures the two base roles exist, every catalog
 * permission exists, and admin holds all permissions.
 */
export async function seed(): Promise<void> {
    const [adminRole] = await Role.findOrCreate({
        where: { name: 'admin' },
        defaults: { name: 'admin', description: 'Full administrative access' },
    });
    await Role.findOrCreate({
        where: { name: 'user' },
        defaults: { name: 'user', description: 'Default authenticated user' },
    });

    for (const name of PERMISSIONS) {
        const [permission] = await Permission.findOrCreate({ where: { name }, defaults: { name } });
        await RolePermission.findOrCreate({ where: { roleId: adminRole.id, permissionId: permission.id } });
    }
}
