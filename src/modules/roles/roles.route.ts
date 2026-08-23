import { injectable } from 'tsyringe';
import { BaseRoute } from '../../common/base.route.js';
import { container } from '../../container.js';
import { RoleController } from './roles.controller.js';

@injectable()
export class RoleRoute extends BaseRoute {
    private roleController: RoleController;

    constructor() {
        super('/api/roles');
        this.roleController = container.resolve(RoleController);
        this.initializeRoutes();
    }

    protected initializeRoutes(): void {
        this.get('/:id/permissions', [], this.roleController, 'getRolePermissions');
    }
}
