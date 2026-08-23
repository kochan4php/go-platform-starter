import { logger } from '../common/utils/logger.js';
import { prisma } from '../database/connection.js';

export class HealthChecker {
    private static intervalId: NodeJS.Timeout | null = null;

    public static start(intervalMs: number = 30000): void {
        if (HealthChecker.intervalId) {
            return;
        }

        HealthChecker.intervalId = setInterval(async () => {
            try {
                await prisma.$queryRaw`SELECT 1`;
            } catch (error: any) {
                logger.error('HealthChecker', `Database periodic health check failed: ${error.message}`);
                // Further logic like triggering an alert or graceful shutdown can be added here
            }
        }, intervalMs);

        logger.info('HealthChecker', `Started DB health checker on ${intervalMs}ms interval`);
    }

    public static stop(): void {
        if (HealthChecker.intervalId) {
            clearInterval(HealthChecker.intervalId);
            HealthChecker.intervalId = null;
            logger.info('HealthChecker', 'Stopped DB health checker');
        }
    }
}
