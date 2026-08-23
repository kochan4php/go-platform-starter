/**
 * @description This file contains the App class to init express application
 * @author {Deo Sbrn}
 */

import SwaggerParser from '@apidevtools/swagger-parser';
import { apiReference } from '@scalar/express-api-reference';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Application } from 'express';
import { rateLimit } from 'express-rate-limit';
import fs from 'fs';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { container, injectable } from 'tsyringe';
import type { BaseRoute } from './common/base.route.js';
import { errorHandler } from './common/middlewares/error.middleware.js';
import { resFailed } from './common/response.js';
import { corsConfig, limitterConfig } from './config/app.js';
import { HealthRoute } from './health/health.route.js';
import { AuthRoute } from './modules/auth/auth.route.js';
import { CoreRoute } from './modules/core/core.route.js';
import { PermissionRoute } from './modules/roles/permissions.route.js';
import { RoleRoute } from './modules/roles/roles.route.js';
import { UserRoute } from './modules/users/users.route.js';

@injectable()
export class App {
    private readonly app: Application;

    constructor() {
        this.app = express();
        this.initializeMiddlewares();
        this.initializeDocs();
        this.initializeRoutes();
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
        this.app.use(cors(corsConfig()));
        this.app.use(rateLimit(limitterConfig()));
        this.app.use(cookieParser());
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));
        this.app.use(morgan('dev'));
    }

    private initializeDocs(): void {
        const openapiPath = path.resolve(process.cwd(), 'openapi/openapi.yaml');
        if (fs.existsSync(openapiPath)) {
            let bundledSpec: any = null;
            SwaggerParser.bundle(openapiPath)
                .then((spec) => {
                    bundledSpec = spec;
                })
                .catch((err) => console.error('Failed to bundle openapi:', err));

            // Raw bundled spec (consumed by DAST scanners and codegen tools)
            this.app.get('/docs/openapi.json', (_, res) => {
                if (!bundledSpec) {
                    return res.status(503).json({ success: false, message: 'API documentation is still loading' });
                }
                return res.json(bundledSpec);
            });

            this.app.use('/docs', (req, res, next) => {
                if (!bundledSpec) {
                    return res.status(503).send('API Documentation is still loading...');
                }
                apiReference({
                    theme: 'purple',
                    spec: {
                        content: bundledSpec,
                    },
                })(req as any, res as any, next);
            });
        }
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

        // 404 Not Found
        this.app.use((_, res) => resFailed(res, 404, 'Path not found. See /api/v1 for the API index and /docs for documentation'));
    }

    private initializeErrorHandling(): void {
        this.app.use(errorHandler);
    }
}
