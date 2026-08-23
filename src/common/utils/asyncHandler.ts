import type { NextFunction, Request, Response } from 'express';

export class AsyncHandler {
    public static handle<T = any>(fn: (req: Request, res: Response, next: NextFunction) => Promise<T>) {
        return (req: Request, res: Response, next: NextFunction) => {
            Promise.resolve(fn(req, res, next)).catch(next);
        };
    }
}

export const asyncHandler = AsyncHandler.handle;
