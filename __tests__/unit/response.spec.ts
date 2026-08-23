import type { Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import { resFailed, resSuccess } from '../../src/common/response.js';

const mockResponse = () => {
    const res: Partial<Response> = {};
    res.status = vi.fn().mockReturnThis() as any;
    res.type = vi.fn().mockReturnThis() as any;
    res.json = vi.fn().mockReturnThis() as any;
    return res as Response;
};

describe('response envelope', () => {
    it('resSuccess emits { success:true, message, data }', () => {
        const res = mockResponse();
        resSuccess(res, 200, 'ok', { hello: 1 });
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ success: true, message: 'ok', data: { hello: 1 } });
    });

    it('resFailed emits { success:false, message, error }', () => {
        const res = mockResponse();
        resFailed(res, 400, 'bad input', 'details');
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ success: false, message: 'bad input', error: 'details' });
    });
});
