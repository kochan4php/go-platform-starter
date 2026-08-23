import { Request, Response, NextFunction } from 'express';

export interface AuthUser {
    id: string;
    email?: string;
    [key: string]: any;
}

export interface IAuthGuard {
    verify(req: Request, res: Response, next: NextFunction): Promise<void>;
}
