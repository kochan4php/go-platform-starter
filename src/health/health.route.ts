import { injectable } from 'tsyringe';
import { BaseRoute } from '../common/base.route.js';
import { container } from '../container.js';
import { HealthController } from './health.controller.js';

@injectable()
export class HealthRoute extends BaseRoute {
    private healthController: HealthController;

    constructor() {
        super('/api/v1/health');
        this.healthController = container.resolve(HealthController);
        this.initializeRoutes();
    }

    protected initializeRoutes(): void {
        this.get('/', [], this.healthController, 'healthCheck');
        this.get('/db', [], this.healthController, 'dbHealthCheck');
    }
}
