import type { Response } from 'express';

export class ResponseHelper {
    public static resSuccess(res: Response, status: number, message: string, data?: object | any): Response {
        return res.status(status).type('application/json').json({ success: true, message, data });
    }

    public static resFailed(res: Response, status: number, message: string, error?: object | any): Response {
        return res.status(status).type('application/json').json({ success: false, message, error });
    }
}

export const resSuccess = ResponseHelper.resSuccess;
export const resFailed = ResponseHelper.resFailed;
