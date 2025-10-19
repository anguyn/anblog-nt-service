"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationQueue = void 0;
exports.addNotificationJob = addNotificationJob;
const bullmq_1 = require("bullmq");
const redis_1 = require("../lib/redis");
exports.notificationQueue = new bullmq_1.Queue('notification', {
    connection: redis_1.redis,
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
async function addNotificationJob(data) {
    return exports.notificationQueue.add('send-notification', data);
}
//# sourceMappingURL=notification.queue.js.map