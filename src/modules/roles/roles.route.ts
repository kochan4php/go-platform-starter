import { injectable } from 'tsyringe';
import { BaseRoute } from '../../common/base.route.js';
import { validate } from '../../common/middlewares/validate.middleware.js';
import { container } from '../../container.js';
import { RoleController } from './roles.controller.js';
import { createRoleSchema, replacePermissionsSchema, roleIdSchema, updateRoleSchema } from './roles.dto.js';

@injectable()
export class RoleRoute extends BaseRoute {
    private roleController: RoleController;

    constructor() {
        super('/api/v1/roles');
        this.roleController = container.resolve(RoleController);
        this.initializeRoutes();
    }

    protected initializeRoutes(): void {
        this.get('/', [], this.roleController, 'getAllRoles');
        this.get('/:id', [validate(roleIdSchema)], this.roleController, 'getRoleById');
        this.get('/:id/permissions', [validate(roleIdSchema)], this.roleController, 'getRolePermissions');
        this.post('/', [validate(createRoleSchema)], this.roleController, 'createRole');
        this.put('/:id', [validate(updateRoleSchema)], this.roleController, 'updateRoleById');
        this.put('/:id/permissions', [validate(replacePermissionsSchema)], this.roleController, 'replaceRolePermissions');
        this.delete('/:id', [validate(roleIdSchema)], this.roleController, 'deleteRoleById');
    }
}
