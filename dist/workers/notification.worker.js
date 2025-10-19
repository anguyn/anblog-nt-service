"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationWorker = void 0;
const bullmq_1 = require("bullmq");
const redis_1 = require("../lib/redis");
exports.notificationWorker = new bullmq_1.Worker('notification', async (job) => {
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
    connection: redis_1.redis,
    concurrency: 10,
});
exports.notificationWorker.on('completed', (job) => {
    console.log(`✅ Notification job ${job.id} completed`);
});
exports.notificationWorker.on('failed', (job, err) => {
    console.error(`❌ Notification job ${job?.id} failed:`, err.message);
});
//# sourceMappingURL=notification.worker.js.map