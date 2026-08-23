import { CoreController } from './core.controller';
import { container } from '../../container';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { BaseRoute } from '../../common/base.route';

import { injectable } from 'tsyringe';

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
