import { SMTP_FROM, SMTP_HOST, SMTP_PASS, SMTP_PORT, SMTP_USER } from '../../config/env.js';
import { moduleLogger } from '../utils/logger.js';
import type { IMailer, MailInput } from './mailer.interface.js';

const log = moduleLogger('mailer');

/**
 * SMTP adapter. nodemailer is imported lazily so console-mode installs never load it.
 * Requires MAILER_DRIVER=smtp plus SMTP_* env values (validated in config/env.ts).
 */
export class SmtpMailer implements IMailer {
    public async send(input: MailInput): Promise<void> {
        if (!SMTP_HOST) {
            throw new Error('MAILER_DRIVER=smtp requires SMTP_HOST');
        }

        const nodemailer = await import('nodemailer');
        const transport = nodemailer.createTransport({
            host: SMTP_HOST,
            port: SMTP_PORT,
            secure: SMTP_PORT === 465,
            auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
        });

        await transport.sendMail({ from: SMTP_FROM, to: input.to, subject: input.subject, html: input.html });
        log.info({ to: input.to, subject: input.subject }, 'email sent via smtp');
    }
}
