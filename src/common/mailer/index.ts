import { MAILER_DRIVER } from '../../config/env.js';
import { ConsoleMailer } from './console.mailer.js';
import type { IMailer, MailInput } from './mailer.interface.js';
import { SmtpMailer } from './smtp.mailer.js';

export type { IMailer, MailInput };

/** Resolves the configured transport once at boot. */
export function createMailer(): IMailer {
    return MAILER_DRIVER === 'smtp' ? new SmtpMailer() : new ConsoleMailer();
}
