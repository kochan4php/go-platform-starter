import { injectable } from 'tsyringe';
import { BaseRoute } from '../../common/base.route.js';
import { container } from '../../container.js';
import { PermissionController } from './permissions.controller.js';

@injectable()
export class PermissionRoute extends BaseRoute {
    private permissionController: PermissionController;

    constructor() {
        super('/api/v1/permissions');
        this.permissionController = container.resolve(PermissionController);
        this.initializeRoutes();
    }

    protected initializeRoutes(): void {
        this.get('/', [], this.permissionController, 'getAllPermissions');
    }
}
