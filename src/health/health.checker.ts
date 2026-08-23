import { logger } from '../common/utils/logger.js';
import { sequelize } from '../database/connection.js';

export class HealthChecker {
    private static intervalId: NodeJS.Timeout | null = null;

    public static start(intervalMs: number = 30000): void {
        if (HealthChecker.intervalId) {
            return;
        }

        HealthChecker.intervalId = setInterval(async () => {
            try {
                await sequelize.query('SELECT 1');
            } catch (error: any) {
                logger.error({ err: error }, 'HealthChecker: periodic database check failed');
                // Further logic like triggering an alert or graceful shutdown can be added here
            }
        }, intervalMs);

        logger.info(`HealthChecker started on ${intervalMs}ms interval`);
    }

    public static stop(): void {
        if (HealthChecker.intervalId) {
            clearInterval(HealthChecker.intervalId);
            HealthChecker.intervalId = null;
            logger.info('HealthChecker stopped');
        }
    }
}
