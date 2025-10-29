import { EmailProvider, SendEmailParams } from './types';
import { config } from '../../config';

interface SendPulseTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export class SendPulseProvider implements EmailProvider {
  private apiUserId: string;
  private apiSecret: string;
  private tokenCache: { token: string; expiresAt: number } | null = null;

  constructor() {
    this.apiUserId = config.email.sendpulse.apiUserId;
    this.apiSecret = config.email.sendpulse.apiSecret;
  }

  getName(): string {
    return 'SendPulse';
  }

  private async getToken(): Promise<string> {
    if (this.tokenCache && this.tokenCache.expiresAt > Date.now()) {
      return this.tokenCache.token;
    }

    try {
      const response = await fetch('https://api.sendpulse.com/oauth/access_token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'client_credentials',
          client_id: this.apiUserId,
          client_secret: this.apiSecret,
        }),
      });

      const data = (await response.json()) as SendPulseTokenResponse;

      if (!data.access_token) {
        throw new Error('Failed to get SendPulse access token');
      }

      this.tokenCache = {
        token: data.access_token,
        expiresAt: Date.now() + 55 * 60 * 1000,
      };

      return data.access_token;
    } catch (error) {
      console.error('SendPulse auth error:', error);
      throw error;
    }
  }

  async send(params: SendEmailParams) {
    try {
      const token = await this.getToken();

      const emailData = {
        email: {
          from: {
            name: config.email.from.name,
            email: config.email.from.email,
          },
          to: Array.isArray(params.to) ? params.to.map((email) => ({ email })) : [{ email: params.to }],
          subject: params.subject,
          html: params.html,
          ...(params.text && { text: params.text }),
          ...(params.replyTo && { reply_to: { email: params.replyTo } }),
          ...(params.attachments && {
            attachments: params.attachments.map((att) => ({
              name: att.filename,
              content: typeof att.content === 'string' ? att.content : att.content.toString('base64'),
              type: att.contentType || 'application/octet-stream',
            })),
          }),
        },
      };

      const response = await fetch('https://api.sendpulse.com/smtp/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(emailData),
      });

      const result = (await response.json()) as { result?: string; message?: string };

      if (!response.ok) {
        throw new Error(result.message || 'SendPulse API error');
      }

      console.log('✅ Email sent via SendPulse:', result);
      return { success: true, data: result };
    } catch (error) {
      console.error('❌ SendPulse send failed:', error);
      return { success: false, error };
    }
  }
}
