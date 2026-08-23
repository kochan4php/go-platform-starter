import type { ErrorRequestHandler, NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/AppError.js';
import { logger } from '../utils/logger.js';

/**
 * @description Central error handler. Emits the same envelope as resFailed():
 * { success:false, message, error }. Internal messages are never leaked to clients —
 * unexpected errors log server-side and return a generic 500.
 */
export class ErrorHandlerMiddleware {
    public handle: ErrorRequestHandler = (err: any, _: Request, res: Response, __: NextFunction): void => {
        let statusCode = 500;
        let message = 'Internal Server Error';
        let error: unknown;

        if (err instanceof AppError) {
            statusCode = err.statusCode;
            message = err.message;
            error = err.message;
        } else if (err?.name === 'ZodError' || (err instanceof Error && err.name === 'ZodError')) {
            statusCode = 400;
            message = err.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ');
            error = message;
        }

        if (statusCode >= 500) {
            logger.error('ErrorHandler', err?.stack || err);
        }

        res.status(statusCode).json({
            success: false,
            message,
            ...(statusCode < 500 ? { error } : {}),
        });
    };
}

export const errorHandler = new ErrorHandlerMiddleware().handle.bind(new ErrorHandlerMiddleware());
