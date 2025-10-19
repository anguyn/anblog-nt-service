"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanupOldJobs = cleanupOldJobs;
const email_queue_1 = require("../queues/email.queue");
const notification_queue_1 = require("../queues/notification.queue");
async function cleanupOldJobs() {
    try {
        await email_queue_1.emailQueue.clean(24 * 3600 * 1000, 1000, 'completed');
        await notification_queue_1.notificationQueue.clean(24 * 3600 * 1000, 1000, 'completed');
        await email_queue_1.emailQueue.clean(7 * 24 * 3600 * 1000, 1000, 'failed');
        await notification_queue_1.notificationQueue.clean(7 * 24 * 3600 * 1000, 1000, 'failed');
        console.log('✅ Job cleanup completed');
    }
    catch (error) {
        console.error('❌ Job cleanup failed:', error);
    }
}
//# sourceMappingURL=cleanup-jobs.js.map