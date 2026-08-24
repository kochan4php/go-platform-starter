/**
 * @description This file is the entry point of the application
 * @description It contains the Bootstrap class to start the server
 * @author {Deo Sbrn}
 */

import 'reflect-metadata';
import { Server } from 'socket.io';
import { container, injectable } from 'tsyringe';
import { App } from './app.js';
import { logger } from './common/utils/logger.js';
import { socketConfig } from './config/app.js';
import { PORT } from './config/env.js';
import { closeDatabase, connectDatabase } from './database/connection.js';
import { HealthChecker } from './health/health.checker.js';
import { registerRealtime } from './modules/realtime/realtime.handler.js';
import type { ClientToServerEvents, InterServerEvents, ServerToClientEvents, SocketData } from './modules/realtime/realtime.types.js';

@injectable()
export class Bootstrap {
    public async start(): Promise<void> {
        try {
            // 1. Establish database connection (throws after retries are exhausted)
            await connectDatabase();

            // 2. Start periodic health check
            HealthChecker.start();

            // 3. Resolve App and start HTTP listener
            const app = container.resolve(App);
            const server = app.instance.listen(PORT, () => {
                logger.info(`server started on port ${PORT}`);
            });

            // 4. Start Socket.IO with typed events + handshake auth
            const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(server, socketConfig());
            registerRealtime(io);

            // 5. Handle graceful shutdown
            this.handleGracefulShutdown(server);
        } catch (error: any) {
            logger.error({ err: error }, 'bootstrap failed');
            process.exit(1);
        }
    }

    private handleGracefulShutdown(server: any): void {
        const shutdown = async (signal: string) => {
            logger.info({ signal }, 'shutting down gracefully');
            HealthChecker.stop();

            server.close(async () => {
                logger.info('http server closed');
                try {
                    await closeDatabase();
                    logger.info('database connection closed');
                    process.exit(0);
                } catch (error: any) {
                    logger.error({ err: error }, 'error during database disconnection');
                    process.exit(1);
                }
            });
        };

        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));
    }
}

// Instantiate and start the application
container.resolve(Bootstrap).start();
