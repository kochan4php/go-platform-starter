import type { NextFunction, Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import { AppError, ValidationError } from '../../src/common/errors/AppError.js';
import { errorHandler } from '../../src/common/middlewares/error.middleware.js';

const mockRes = () => {
    const res: Partial<Response> = {};
    res.status = vi.fn().mockReturnThis() as any;
    res.json = vi.fn().mockReturnThis() as any;
    return res as Response;
};

describe('error middleware', () => {
    it('maps AppError to its status code and unified envelope', () => {
        const res = mockRes();
        const next = vi.fn() as NextFunction;
        errorHandler(new ForbiddenLike(), {} as Request, res, next);
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({ success: false, message: 'nope', error: 'nope' });
    });

    it('hides internal message on unexpected 500 errors', () => {
        const res = mockRes();
        errorHandler(new Error('database password is hunter2'), {} as Request, res, undefined as any);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith(expect.not.stringContaining('hunter2') as any);
        // envelope shape without leaked internals
        const payload = (res.json as any).mock.calls[0][0];
        expect(payload.success).toBe(false);
        expect(payload.message).toBe('Internal Server Error');
        expect(payload.error).toBeUndefined();
    });

    it('maps ZodError to a joined-message 400', () => {
        const res = mockRes();
        const zodError = new ValidationError('path: bad');
        (zodError as any).name = 'ZodError';
        (zodError as any).errors = [{ path: ['body', 'email'], message: 'bad' }];
        errorHandler(zodError, {} as Request, res, undefined as any);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    class ForbiddenLike extends AppError {
        constructor() {
            super('nope', 403);
        }
    }
});
