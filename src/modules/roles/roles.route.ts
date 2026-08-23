import { BaseRoute } from '../../common/base.route';
import { RoleController } from './roles.controller';
import { container } from '../../container';
import { injectable } from 'tsyringe';

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
