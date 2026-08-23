import type { Request, Response } from 'express';
import { inject, injectable } from 'tsyringe';
import { RequirePermission } from '../../common/rbac/decorators.js';
import { resFailed, resSuccess } from '../../common/response.js';
import { logger } from '../../common/utils/logger.js';
import { Permission } from '../../database/models/permission.model.js';
import { RolePermission } from '../../database/models/role-permission.model.js';
import { RoleService } from './roles.service.js';

@injectable()
export class RoleController {
    constructor(@inject(RoleService) private readonly roleService: RoleService) {}

    @RequirePermission('role:read:any')
    public async getAllRoles(_: Request, res: Response): Promise<Response> {
        try {
            const roles = await this.roleService.getAllRoles();
            return resSuccess(res, 200, 'Success get all roles', { roles });
        } catch (error: any) {
            logger.error({ err: error }, 'RoleController.getAllRoles failed');
            return resFailed(res, 500, 'Internal Server Error');
        }
    }

    @RequirePermission('role:read:any')
    public async getRoleById(req: Request, res: Response): Promise<Response> {
        try {
            const role = await this.roleService.getOneRoleById(req.params.id as string);
            if (!role) {
                return resFailed(res, 404, 'Role not found');
            }
            return resSuccess(res, 200, 'Success get role by id', { role });
        } catch (error: any) {
            logger.error({ err: error }, 'RoleController.getRoleById failed');
            return resFailed(res, 500, 'Internal Server Error');
        }
    }

    @RequirePermission('role:create:any')
    public async createRole(req: Request, res: Response): Promise<Response> {
        try {
            const { name, description, permissions = [] } = req.body;
            const role = await this.roleService.createRole({ name, description });
            await this.syncPermissions(role.id, permissions);
            return resSuccess(res, 201, 'Success create new role', { role });
        } catch (error: any) {
            logger.error({ err: error }, 'RoleController.createRole failed');
            return resFailed(res, error.statusCode || 500, 'Internal Server Error');
        }
    }

    @RequirePermission('role:update:any')
    public async updateRoleById(req: Request, res: Response): Promise<Response> {
        try {
            const { name, description } = req.body;
            const role = await this.roleService.updateOneRoleById(req.params.id as string, { name, description });
            if (!role) {
                return resFailed(res, 404, 'Role not found');
            }
            return resSuccess(res, 200, 'Success update role by id', { role });
        } catch (error: any) {
            logger.error({ err: error }, 'RoleController.updateRoleById failed');
            return resFailed(res, 500, 'Internal Server Error');
        }
    }

    @RequirePermission('role:update:any')
    public async replaceRolePermissions(req: Request, res: Response): Promise<Response> {
        try {
            const permissions: string[] = req.body.permissions ?? [];
            const role = await this.roleService.getOneRoleById(req.params.id as string);
            if (!role) {
                return resFailed(res, 404, 'Role not found');
            }
            const synced = await this.syncPermissions(role.id, permissions);
            if (!synced) {
                return resFailed(res, 400, 'One or more permissions are unknown');
            }
            return resSuccess(res, 200, 'Success replace role permissions');
        } catch (error: any) {
            logger.error({ err: error }, 'RoleController.replaceRolePermissions failed');
            return resFailed(res, 500, 'Internal Server Error');
        }
    }

    @RequirePermission('role:delete:any')
    public async deleteRoleById(req: Request, res: Response): Promise<Response> {
        try {
            const deleted = await this.roleService.deleteOneRoleById(req.params.id as string);
            if (!deleted) {
                return resFailed(res, 404, 'Role not found');
            }
            return resSuccess(res, 200, 'Success delete role by id');
        } catch (error: any) {
            logger.error({ err: error }, 'RoleController.deleteRoleById failed');
            return resFailed(res, 500, 'Internal Server Error');
        }
    }

    @RequirePermission('role:read:any')
    public async getRolePermissions(req: Request, res: Response): Promise<Response> {
        try {
            const role = await this.roleService.getOneRoleById(req.params.id as string);
            if (!role) {
                return resFailed(res, 404, 'Role not found');
            }

            const mappings = await RolePermission.findAll({
                where: { roleId: role.id },
                include: [{ model: Permission, required: true }],
            });
            const permissions = mappings.map((mapping) => (mapping as any).permission);
            return resSuccess(res, 200, 'Success get role permissions', { permissions });
        } catch (error: any) {
            logger.error({ err: error }, 'RoleController.getRolePermissions failed');
            return resFailed(res, 500, 'Internal Server Error');
        }
    }

    private async syncPermissions(roleId: string, permissionNames: string[]): Promise<boolean> {
        const known = await Permission.findAll({ where: { name: permissionNames as any } });
        if (known.length !== permissionNames.length) {
            return false;
        }
        await RolePermission.destroy({ where: { roleId } });
        if (known.length > 0) {
            await RolePermission.bulkCreate(known.map((permission) => ({ roleId, permissionId: permission.id })));
        }
        return true;
    }
}
