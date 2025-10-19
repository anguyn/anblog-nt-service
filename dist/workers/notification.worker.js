import { Worker } from 'bullmq';
import { redis } from '#lib/redis';
export const notificationWorker = new Worker('notification', async (job) => {
    console.log(`Processing notification job ${job.id}...`);
    // TODO: Implement push notification logic
    const { userId, type, title, message, link, data } = job.data;
    console.log(`Would send notification to user ${userId}:`, {
        type,
        title,
        message,
        link,
    });
    return { success: true };
}, {
    connection: redis,
    concurrency: 10,
});
notificationWorker.on('completed', (job) => {
    console.log(`✅ Notification job ${job.id} completed`);
});
notificationWorker.on('failed', (job, err) => {
    console.error(`❌ Notification job ${job?.id} failed:`, err.message);
});
//# sourceMappingURL=notification.worker.js.map