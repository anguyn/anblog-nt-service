import { Resend } from 'resend';
import { EmailProvider, SendEmailParams } from './types';
import { config } from '../../config';

export class ResendProvider implements EmailProvider {
  private client: Resend;

  constructor() {
    this.client = new Resend(config.email.resendApiKey);
  }

  getName(): string {
    return 'Resend';
  }

  async send(params: SendEmailParams) {
    try {
      const result = await this.client.emails.send({
        from: `${config.email.from.name} <${config.email.from.email}>`,
        to: Array.isArray(params.to) ? params.to : [params.to],
        subject: params.subject,
        html: params.html,
        ...(params.text && { text: params.text }),
        ...(params.replyTo && { reply_to: params.replyTo }),
        ...(params.cc && { cc: params.cc }),
        ...(params.bcc && { bcc: params.bcc }),
        ...(params.attachments && {
          attachments: params.attachments.map((att) => ({
            filename: att.filename,
            content: att.content,
            ...(att.contentType && { content_type: att.contentType }),
            ...(att.path && { path: att.path }),
          })),
        }),
      });

      console.log('✅ Email sent via Resend:', result);
      return { success: true, data: result };
    } catch (error) {
      console.error('❌ Resend send failed:', error);
      return { success: false, error };
    }
  }
}
