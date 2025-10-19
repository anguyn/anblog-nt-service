import { Queue } from 'bullmq';
import { redis } from '#lib/redis';

export interface NotificationJobData {
  userId: string;
  type: 'NEW_POST' | 'NEW_COMMENT' | 'COMMENT_REPLY' | 'NEW_FOLLOWER' | 'POST_LIKED' | 'MENTION' | 'SYSTEM';
  title: string;
  message: string;
  link?: string;
  data?: Record<string, any>;
}

export const notificationQueue = new Queue<NotificationJobData>('notification', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
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

export async function addNotificationJob(data: NotificationJobData) {
  return notificationQueue.add('send-notification', data);
}
