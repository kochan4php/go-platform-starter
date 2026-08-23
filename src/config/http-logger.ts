import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Options } from 'pino-http';
import { logger } from '../common/utils/logger.js';

/**
 * @description HTTP request logging + request-ID correlation.
 * Honors an incoming x-request-id, otherwise mints a UUID; the id is echoed on
 * every response and bound to all log lines for that request (`req.log`).
 */
export const httpLoggerOptions = (): Options<IncomingMessage, ServerResponse> => ({
    logger,
    genReqId: (req, res) => {
        const incoming = req.headers['x-request-id'];
        const id = typeof incoming === 'string' && incoming.length > 0 ? incoming : randomUUID();
        res.setHeader('x-request-id', id);
        return id;
    },
    autoLogging: {
        ignore: (req) => Boolean(req.url?.startsWith('/api/v1/health')),
    },
    quietReqLogger: true,
});
