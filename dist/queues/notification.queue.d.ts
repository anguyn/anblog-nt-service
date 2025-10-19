import { Queue } from 'bullmq';
export interface NotificationJobData {
    userId: string;
    type: 'NEW_POST' | 'NEW_COMMENT' | 'COMMENT_REPLY' | 'NEW_FOLLOWER' | 'POST_LIKED' | 'MENTION' | 'SYSTEM';
    title: string;
    message: string;
    link?: string;
    data?: Record<string, any>;
}
export declare const notificationQueue: Queue<NotificationJobData, any, string, NotificationJobData, any, string>;
export declare function addNotificationJob(data: NotificationJobData): Promise<import("bullmq").Job<NotificationJobData, any, string>>;
//# sourceMappingURL=notification.queue.d.ts.map