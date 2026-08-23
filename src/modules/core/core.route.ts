import { injectable } from 'tsyringe';
import { BaseRoute } from '../../common/base.route.js';
import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { container } from '../../container.js';
import { CoreController } from './core.controller.js';

@injectable()
export class CoreRoute extends BaseRoute {
    private coreController: CoreController;

    constructor() {
        super('/api');
        this.coreController = container.resolve(CoreController);
        this.initializeRoutes();
    }

    protected initializeRoutes(): void {
        this.get('/', [], this.coreController, 'index');
    }
}
