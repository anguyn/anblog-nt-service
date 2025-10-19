import { Queue } from 'bullmq';
import { redis } from '#lib/redis';
export const notificationQueue = new Queue('notification', {
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
export async function addNotificationJob(data) {
    return notificationQueue.add('send-notification', data);
}
//# sourceMappingURL=notification.queue.js.map