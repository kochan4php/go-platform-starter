import { injectable } from 'tsyringe';
import { Permission } from '../../database/models/permission.model.js';
import { Role } from '../../database/models/role.model.js';
import { RolePermission } from '../../database/models/role-permission.model.js';
import { UserRole } from '../../database/models/user-role.model.js';

/**
 * @description Resolves the effective permission set of a user through
 * user -> userRoles -> role -> rolePermissions -> permission.
 */
@injectable()
export class PermissionService {
    public async getPermissions(userId: string): Promise<string[]> {
        const userRoles = await UserRole.findAll({
            where: { userId },
            include: [
                {
                    model: Role,
                    required: true,
                    include: [
                        {
                            model: RolePermission,
                            required: true,
                            include: [{ model: Permission, required: true }],
                        },
                    ],
                },
            ],
        });

        const permissions = new Set<string>();
        for (const userRole of userRoles) {
            const rolePermissions = (userRole.role as any).rolePermissions ?? [];
            for (const rolePermission of rolePermissions) {
                permissions.add(rolePermission.permission.name);
            }
        }
        return [...permissions];
    }

    public async hasPermission(userId: string, permission: string): Promise<boolean> {
        const permissions = await this.getPermissions(userId);
        return permissions.includes(permission);
    }
}
