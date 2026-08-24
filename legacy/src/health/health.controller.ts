import type { Request, Response } from 'express';
import { injectable } from 'tsyringe';
import { Public } from '../common/rbac/decorators.js';
import { resFailed, resSuccess } from '../common/response.js';
import { logger } from '../common/utils/logger.js';
import { sequelize } from '../database/connection.js';

@injectable()
export class HealthController {
    @Public()
    public async healthCheck(_: Request, res: Response): Promise<Response> {
        const health = {
            status: 'UP',
            uptime: process.uptime(),
            timestamp: Date.now(),
        };
        return resSuccess(res, 200, 'Health check success', health);
    }

    @Public()
    public async dbHealthCheck(_: Request, res: Response): Promise<Response> {
        try {
            await sequelize.query('SELECT 1');
            return resSuccess(res, 200, 'Database is healthy', { dbHealthy: true, timestamp: Date.now() });
        } catch (error: any) {
            logger.error({ err: error }, 'DatabaseHealthCheck failed');
            return resFailed(res, 503, 'Database is unhealthy', { dbHealthy: false, timestamp: Date.now() });
        }
    }
}
