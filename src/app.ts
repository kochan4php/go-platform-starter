/**
 * @description This file contains the App class to init express application
 * @author {Deo Sbrn}
 */

import { apiReference } from '@scalar/express-api-reference';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Application } from 'express';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { container, injectable } from 'tsyringe';
import type { BaseRoute } from './common/base.route.js';
import { errorHandler } from './common/middlewares/error.middleware.js';
import { resFailed } from './common/response.js';
import { corsConfig, globalLimiterConfig } from './config/app.js';
import { httpLoggerOptions } from './config/http-logger.js';
import { HealthRoute } from './health/health.route.js';
import { AuthRoute } from './modules/auth/auth.route.js';
import { CoreRoute } from './modules/core/core.route.js';
import { PermissionRoute } from './modules/roles/permissions.route.js';
import { RoleRoute } from './modules/roles/roles.route.js';
import { UserRoute } from './modules/users/users.route.js';
import { openApiRegistry } from './openapi/registry.js';

@injectable()
export class App {
    private readonly app: Application;

    constructor() {
        this.app = express();
        this.initializeMiddlewares();
        // Routes first: their constructors register OpenAPI operations,
        // and initializeDocs() builds the spec from those registrations.
        this.initializeRoutes();
        this.initializeDocs();
        this.initializeErrorHandling();
    }

    public get instance(): Application {
        return this.app;
    }

    private initializeMiddlewares(): void {
        this.app.use(
            helmet({
                contentSecurityPolicy: {
                    directives: {
                        defaultSrc: ["'self'"],
                        scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
                        styleSrc: [
                            "'self'",
                            "'unsafe-inline'",
                            'https://fonts.googleapis.com',
                            'https://cdn.jsdelivr.net',
                            'https://fonts.scalar.com',
                        ],
                        fontSrc: ["'self'", 'data:', 'https://fonts.gstatic.com', 'https://cdn.jsdelivr.net', 'https://fonts.scalar.com'],
                        imgSrc: ["'self'", 'data:', 'https://cdn.jsdelivr.net'],
                    },
                },
            }),
        );
        this.app.disable('x-powered-by');
        this.app.use(pinoHttp(httpLoggerOptions()));
        this.app.use(cors(corsConfig()));
        this.app.use(rateLimit(globalLimiterConfig()));
        this.app.use(cookieParser());
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));
    }

    private initializeDocs(): void {
        // Spec is generated synchronously from the zod DTOs via the registry —
        // no file bundling, no loading race, no drift between docs and validation.
        const spec = openApiRegistry.build({
            title: 'Express TS Starter API',
            description:
                'Express 5 + TypeScript + Sequelize + RBAC starter. Auth via JWT bearer tokens; refresh via httpOnly session cookie.',
        });

        this.app.get('/docs/openapi.json', (_, res) => res.json(spec));
        this.app.use('/docs', apiReference({ theme: 'purple', spec: { content: spec as any } }));
    }

    private initializeRoutes(): void {
        const routes: BaseRoute[] = [
            container.resolve(CoreRoute),
            container.resolve(HealthRoute),
            container.resolve(AuthRoute),
            container.resolve(UserRoute),
            container.resolve(RoleRoute),
            container.resolve(PermissionRoute),
        ];

        routes.forEach((route) => {
            this.app.use(route.path, route.router);
        });
    }

    private initializeErrorHandling(): void {
        // 404 Not Found — must be registered after every real route (incl. docs).
        this.app.use((_, res) => resFailed(res, 404, 'Path not found. See /api/v1 for the API index and /docs for documentation'));
        this.app.use(errorHandler);
    }
}
