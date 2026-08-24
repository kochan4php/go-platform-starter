import { randomBytes } from 'node:crypto';
import { PERMISSIONS } from '../../common/rbac/permission.catalog.js';
import { ADMIN_BOOTSTRAP_PASSWORD } from '../../config/env.js';
import { Permission } from '../models/permission.model.js';
import { Role } from '../models/role.model.js';
import { RolePermission } from '../models/role-permission.model.js';
import { User } from '../models/user.model.js';
import { UserRole } from '../models/user-role.model.js';

/**
 * @description Idempotent seeder: base roles, permission catalog (all granted to admin),
 * and a bootstrap admin account. Password comes from ADMIN_BOOTSTRAP_PASSWORD or is
 * generated and printed exactly once at creation time.
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

    const bootstrapPassword = ADMIN_BOOTSTRAP_PASSWORD || `admin-${randomBytes(9).toString('base64url')}`;
    const [adminUser, created] = await User.findOrCreate({
        where: { email: 'admin@example.local' },
        defaults: {
            name: 'Bootstrap Admin',
            phoneNumber: '000000000000',
            email: 'admin@example.local',
            password: bootstrapPassword,
        },
    });
    await UserRole.findOrCreate({ where: { userId: adminUser.id, roleId: adminRole.id } });

    if (created && !ADMIN_BOOTSTRAP_PASSWORD) {
        console.log(`[seed] bootstrap admin created — login once with: admin@example.local / ${bootstrapPassword}`);
    }
}
