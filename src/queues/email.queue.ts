import { Queue } from 'bullmq';
import { redis } from '#lib/redis';

export interface EmailJobData {
  to: string | string[];
  subject: string;
  html?: string; // Optional now
  text?: string;
  template?: string;
  data?: Record<string, any>;
  userId?: string;
}

// Priority levels
export enum EmailPriority {
  CRITICAL = 1, // Verification, Password Reset
  HIGH = 5, // Welcome emails
  NORMAL = 10, // Regular notifications
  LOW = 15, // Digest, Marketing
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
