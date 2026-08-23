import { injectable } from 'tsyringe';
import { BaseRoute } from '../../common/base.route.js';
import { container } from '../../container.js';
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
        this.get('/', [], this.coreController, 'index');
    }
}
