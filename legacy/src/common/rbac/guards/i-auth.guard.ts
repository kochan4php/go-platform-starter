import type { NextFunction, Request, Response } from 'express';

/**
 * @description Contract for authentication guards. Implementations MUST attach the
 * decoded user to `req.user` before calling next(), or throw an UnauthorizedError.
 */
export interface IAuthGuard {
    verify(req: Request, res: Response, next: NextFunction): Promise<void>;
}
