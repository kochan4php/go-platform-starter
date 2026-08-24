import { injectable } from 'tsyringe';
import { BaseRoute } from '../../common/base.route.js';
import { container } from '../../container.js';
import { openApiRegistry } from '../../openapi/registry.js';
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
        openApiRegistry.register({
            path: '/api/v1/permissions',
            method: 'get',
            tag: 'Roles',
            summary: 'Permission catalog',
            security: 'bearer',
        });

        this.get('/', [], this.permissionController, 'getAllPermissions');
    }
}
