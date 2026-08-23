import { injectable } from 'tsyringe';
import { BaseRoute } from '../../common/base.route.js';
import { container } from '../../container.js';
import { openApiRegistry } from '../../openapi/registry.js';
import { CoreController } from './core.controller.js';

@injectable()
export class CoreRoute extends BaseRoute {
    private coreController: CoreController;

    constructor() {
        super('/api/v1');
        this.coreController = container.resolve(CoreController);
        this.initializeRoutes();
    }

    protected initializeRoutes(): void {
        openApiRegistry.register({ path: '/api/v1', method: 'get', tag: 'Core', summary: 'API index' });

        this.get('/', [], this.coreController, 'index');
    }
}
