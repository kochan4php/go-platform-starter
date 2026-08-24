import type { Request, Response } from 'express';
import { injectable } from 'tsyringe';
import { RequirePermission } from '../../common/rbac/decorators.js';
import { PERMISSIONS } from '../../common/rbac/permission.catalog.js';
import { resSuccess } from '../../common/response.js';

@injectable()
export class PermissionController {
    @RequirePermission('role:read:any')
    public async getAllPermissions(_: Request, res: Response): Promise<Response> {
        return resSuccess(res, 200, 'Success get permission catalog', { permissions: PERMISSIONS });
    }
}
