import type { NextFunction, Request } from 'express';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { ValidationError } from '../../src/common/errors/AppError.js';
import { validate } from '../../src/common/middlewares/validate.middleware.js';

const schema = z.object({
    body: z.object({ limit: z.coerce.number().default(10) }),
    params: z.object({ id: z.string().uuid() }),
    query: z.object({}).optional(),
});

describe('validate middleware', () => {
    it('coerces and writes parsed values back onto the request', async () => {
        const middleware = validate(schema as any);
        const req = { body: {}, query: {}, params: { id: crypto.randomUUID() } } as unknown as Request;
        const next = vi.fn() as NextFunction;
        await middleware(req, {} as any, next);
        expect(next).toHaveBeenCalledWith();
        expect((req as any).body.limit).toBe(10);
    });

    it('rejects invalid input with a ValidationError', async () => {
        const middleware = validate(schema as any);
        const req = { body: {}, query: {}, params: { id: 'not-a-uuid' } } as unknown as Request;
        const next = vi.fn() as NextFunction;
        await middleware(req, {} as any, next);
        const error = next.mock.calls[0][0];
        expect(error).toBeInstanceOf(ValidationError);
    });
});
