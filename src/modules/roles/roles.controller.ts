import type { Request, Response } from 'express';
import { injectable } from 'tsyringe';
import { RequirePermission } from '../../common/rbac/decorators.js';
import { resFailed, resSuccess } from '../../common/response.js';
import { logger } from '../../common/utils/logger.js';
import { Permission } from '../../database/models/permission.model.js';
import { Role } from '../../database/models/role.model.js';
import { RolePermission } from '../../database/models/role-permission.model.js';

@injectable()
export class RoleController {
    @RequirePermission('role:read:any')
    public async getRolePermissions(req: Request, res: Response): Promise<Response> {
        try {
            const id = req.params.id as string;
            const role = await Role.findByPk(id, {
                include: [{ model: RolePermission, required: false, include: [{ model: Permission, required: false }] }],
            });

            if (!role) {
                return resFailed(res, 404, 'Role not found');
            }

            const roleWithPermissions = role.toJSON() as any;
            const permissions = (roleWithPermissions.rolePermissions ?? []).map((rp: any) => rp.permission);
            return resSuccess(res, 200, 'Success get role permissions', { permissions });
        } catch (error: any) {
            logger.error('RoleController.getRolePermissions', error.message);
            return resFailed(res, 500, 'Internal Server Error');
        }
    }
}
