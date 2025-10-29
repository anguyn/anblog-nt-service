import { Queue } from 'bullmq';
import { redis } from '#libs/redis';
import { Locale } from '#libs/i18n';
import { EmailTemplate } from '#templates/index';
import { EmailAttachment } from '#libs/email-providers';

export interface EmailJobData {
  to: string | string[];
  subject?: string;
  html?: string;
  text?: string;

  template?: EmailTemplate;
  templateData?: Record<string, any>;

  locale?: Locale;

  attachments?: EmailAttachment[];
  replyTo?: string;
  cc?: string[];
  bcc?: string[];

  userId?: string;
  emailType?: 'verification' | 'password_reset' | 'newsletter' | 'notification' | 'custom';
}

export enum EmailPriority {
  CRITICAL = 1,
  HIGH = 5,
  NORMAL = 10,
  LOW = 15,
}

export const emailQueue = new Queue<EmailJobData>('email', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      age: 24 * 3600,
      count: 1000,
    },
    removeOnFail: {
      age: 7 * 24 * 3600,
    },
  },
});

export async function addEmailJob(data: EmailJobData, priority: EmailPriority = EmailPriority.NORMAL) {
  return emailQueue.add('send-email', data, {
    priority,
    ...(priority === EmailPriority.CRITICAL && { delay: 0 }),
  });
}
