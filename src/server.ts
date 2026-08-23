/**
 * @description This file is the entry point of the application
 * @description It contains the Bootstrap class to start the server
 * @author {Deo Sbrn}
 */

import 'reflect-metadata';
import { Server, type Socket } from 'socket.io';
import { container, injectable } from 'tsyringe';
import { App } from './app.js';
import { logger } from './common/utils/logger.js';
import { socketConfig } from './config/app.js';
import { PORT } from './config/env.js';
import { closeDatabase, connectDatabase } from './database/connection.js';
import { HealthChecker } from './health/health.checker.js';
import socketController from './modules/core/socket.controller.js';

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
                logger.info('Server', `started on port ${PORT}`);
            });

            // 4. Start Socket.IO
            const io = new Server(server, socketConfig());
            io.on('connection', (socket: Socket) => socketController(socket, io));

            // 5. Handle graceful shutdown
            this.handleGracefulShutdown(server);
        } catch (error: any) {
            logger.error('Bootstrap', `Failed to start server: ${error.message}`);
            process.exit(1);
        }
    }

    private handleGracefulShutdown(server: any): void {
        const shutdown = async (signal: string) => {
            logger.info('Server', `Received ${signal}. Shutting down gracefully...`);
            HealthChecker.stop();

            server.close(async () => {
                logger.info('Server', 'Closed HTTP server');
                try {
                    await closeDatabase();
                    logger.info('Database', 'Closed database connection');
                    process.exit(0);
                } catch (error: any) {
                    logger.error('Database', `Error during disconnection: ${error.message}`);
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
