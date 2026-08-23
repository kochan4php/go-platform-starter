import type { Request, Response } from 'express';
import { injectable } from 'tsyringe';
import { RequirePermission } from '../../common/authorization/decorators.js';
import { resFailed, resSuccess } from '../../common/response.js';
import { logger } from '../../common/utils/logger.js';
import { prisma } from '../../database/connection.js';

@injectable()
export class RoleController {
    constructor() {}

    @RequirePermission('role:view:any')
    public async getRolePermissions(req: Request, res: Response): Promise<Response> {
        try {
            const id = req.params.id as string;
            if (!id) return resFailed(res, 400, 'ID is required');

            const role = await prisma.role.findUnique({
                where: { id },
                include: {
                    rolePermissions: {
                        include: {
                            permission: true,
                        },
                    },
                },
            });

            if (!role) {
                return resFailed(res, 404, 'Role not found');
            }

            const permissions = role.rolePermissions.map((rp: any) => rp.permission);
            return resSuccess(res, 200, 'Success', { permissions });
        } catch (error: any) {
            logger.error('RoleController.getRolePermissions', error.message);
            return resFailed(res, 500, error.message);
        }
    }
}
