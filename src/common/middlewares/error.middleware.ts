import type { ErrorRequestHandler, NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/AppError.js';
import { logger } from '../utils/logger.js';

export class ErrorHandlerMiddleware {
    public handle: ErrorRequestHandler = (err: any, req: Request, res: Response, next: NextFunction): void => {
        let statusCode = 500;
        let message = 'Internal Server Error';

        if (err instanceof AppError) {
            statusCode = err.statusCode;
            message = err.message;
        } else if (err.name === 'ZodError') {
            statusCode = 400;
            message = err.errors.map((e: any) => e.message).join(', ');
        } else if (err.message) {
            message = err.message;
        }

        if (statusCode === 500) {
            logger.error('ErrorHandler', err);
        }

        res.status(statusCode).json({
            success: false,
            error: {
                code: statusCode.toString(),
                message,
            },
        });
    };
}

export const errorHandler = new ErrorHandlerMiddleware().handle.bind(new ErrorHandlerMiddleware());
