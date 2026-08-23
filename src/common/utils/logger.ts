import pino from 'pino';
import { LOG_LEVEL, NODE_ENV } from '../../config/env.js';

/**
 * @description Single structured logger (pino). Pretty-printed outside production;
 * JSON everywhere else. Request-scoped child loggers come from pino-http (`req.log`).
 */
export const logger = pino(
    {
        level: LOG_LEVEL,
        base: { env: NODE_ENV },
    },
    NODE_ENV === 'production' || LOG_LEVEL === 'silent'
        ? undefined
        : pino.transport({
              target: 'pino-pretty',
              options: { colorize: true, translateTime: 'SYS:standard', singleLine: true },
          }),
);

/** Module-scoped child logger helper: `const log = moduleLogger('auth')`. */
export const moduleLogger = (module: string) => logger.child({ module });
