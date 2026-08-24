import { injectable } from 'tsyringe';
import { BaseRoute } from '../common/base.route.js';
import { container } from '../container.js';
import { openApiRegistry } from '../openapi/registry.js';
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
        openApiRegistry.register({ path: '/api/v1/health', method: 'get', tag: 'Health', summary: 'Liveness probe' });
        openApiRegistry.register({ path: '/api/v1/health/db', method: 'get', tag: 'Health', summary: 'Readiness probe (database)' });

        this.get('/', [], this.healthController, 'healthCheck');
        this.get('/db', [], this.healthController, 'dbHealthCheck');
    }
}
