import type { NextFunction, Request, Response } from 'express';
import { ZodError, type ZodIssue, type ZodObject } from 'zod';
import { ValidationError } from '../errors/AppError.js';

export class ValidateMiddleware {
    public static handle(schema: ZodObject<any>) {
        return async (req: Request, _res: Response, next: NextFunction) => {
            try {
                const parsed = await schema.parseAsync({
                    body: req.body,
                    query: req.query,
                    params: req.params,
                });
                if (parsed.body !== undefined) req.body = parsed.body;
                if (parsed.query !== undefined) {
                    // Express 5 backs req.query with a getter — mutating a copy silently
                    // loses the write. Define an own property so parsed/coerced values stick.
                    Object.defineProperty(req, 'query', { value: parsed.query, writable: true, configurable: true });
                }
                if (parsed.params !== undefined) Object.assign(req.params, parsed.params);
                return next();
            } catch (error) {
                if (error instanceof ZodError) {
                    const message = (error as any).issues.map((e: ZodIssue) => `${e.path.join('.')}: ${e.message}`).join(', ');
                    return next(new ValidationError(message));
                }
                return next(error);
            }
        };
    }
}

export const validate = ValidateMiddleware.handle;
