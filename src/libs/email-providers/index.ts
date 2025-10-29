import { EmailProvider, SendEmailParams } from './types';
import { ResendProvider } from './resend.provider';
import { SendPulseProvider } from './sendpulse.provider';
import { config } from '../../config';

class EmailService {
  private primaryProvider: EmailProvider;
  private fallbackProvider: EmailProvider;

  constructor() {
    const primaryProviderType = config.email.provider;

    // Khởi tạo primary và fallback provider
    if (primaryProviderType === 'sendpulse') {
      this.primaryProvider = new SendPulseProvider();
      this.fallbackProvider = new ResendProvider();
    } else {
      this.primaryProvider = new ResendProvider();
      this.fallbackProvider = new SendPulseProvider();
    }

    console.log(`📧 Primary email provider: ${this.primaryProvider.getName()}`);
    console.log(`📧 Fallback email provider: ${this.fallbackProvider.getName()}`);
  }

  async send(params: SendEmailParams): Promise<{ success: boolean; data?: any; error?: any }> {
    // Thử gửi bằng primary provider
    console.log(`📤 Attempting to send email via ${this.primaryProvider.getName()}...`);
    const primaryResult = await this.primaryProvider.send(params);

    if (primaryResult.success) {
      return primaryResult;
    }

    // Nếu primary fail, thử fallback provider
    console.log(`⚠️ ${this.primaryProvider.getName()} failed, trying ${this.fallbackProvider.getName()}...`);
    const fallbackResult = await this.fallbackProvider.send(params);

    if (fallbackResult.success) {
      console.log(`✅ Email sent successfully via fallback provider (${this.fallbackProvider.getName()})`);
      return fallbackResult;
    }

    // Cả 2 đều fail
    console.error('❌ All email providers failed');
    return {
      success: false,
      error: {
        message: 'All email providers failed',
        primaryError: primaryResult.error,
        fallbackError: fallbackResult.error,
      },
    };
  }
}

// Singleton instance
let emailService: EmailService;

export function getEmailProvider(): EmailService {
  if (!emailService) {
    console.log('Dô hong?');
    emailService = new EmailService();
  }
  return emailService;
}

export * from './types';
