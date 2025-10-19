import { emailQueue } from '#queues/email.queue';
import { notificationQueue } from '#queues/notification.queue';
export async function cleanupOldJobs() {
    try {
        await emailQueue.clean(24 * 3600 * 1000, 1000, 'completed');
        await notificationQueue.clean(24 * 3600 * 1000, 1000, 'completed');
        await emailQueue.clean(7 * 24 * 3600 * 1000, 1000, 'failed');
        await notificationQueue.clean(7 * 24 * 3600 * 1000, 1000, 'failed');
        console.log('✅ Job cleanup completed');
    }
    catch (error) {
        console.error('❌ Job cleanup failed:', error);
    }
}
//# sourceMappingURL=cleanup-jobs.js.map