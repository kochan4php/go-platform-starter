import { moduleLogger } from '../utils/logger.js';
import type { IMailer, MailInput } from './mailer.interface.js';

const log = moduleLogger('mailer');

/** Prints every message to stdout — dev/test default; reset links are copy-pasteable. */
export class ConsoleMailer implements IMailer {
    public async send(input: MailInput): Promise<void> {
        log.info({ to: input.to, subject: input.subject }, 'email (console transport)');
        log.info(`----\n${input.html}\n----`);
    }
}
