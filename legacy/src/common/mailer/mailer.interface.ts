export interface MailInput {
    to: string;
    subject: string;
    html: string;
}

/**
 * @description Outbound email port. Adapters: console (dev default), smtp (nodemailer).
 */
export interface IMailer {
    send(input: MailInput): Promise<void>;
}
