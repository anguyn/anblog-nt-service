import cron from 'node-cron';
import { cleanupOldJobs } from './cleanup-jobs';
import { PostService } from '#services/post.service';
import { CleanupService } from '#services/cleanup.service';
import { syncViewCounts } from '#sockets/handlers/post-view.handler';

export function startCronJobs() {
  console.log('🚀 Starting cron jobs...');

  // Cleanup old jobs every day at 2 AM (existing)
  cron.schedule('0 2 * * *', async () => {
    console.log('[CRON] Running job cleanup...');
    await cleanupOldJobs();
  });

  // Publish scheduled posts - every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    try {
      console.log('[CRON] Checking for scheduled posts...');
      await PostService.publishScheduledPosts();
    } catch (error) {
      console.error('[CRON] Error publishing scheduled posts:', error);
    }
  });

  // Process translation queue - every 10 minutes
  cron.schedule('*/10 * * * *', async () => {
    try {
      console.log('[CRON] Processing translation queue...');
      await PostService.processTranslationQueue();
    } catch (error) {
      console.error('[CRON] Error processing translations:', error);
    }
  });

  // Daily newsletter digest - 8:00 AM
  cron.schedule('0 8 * * *', async () => {
    try {
      console.log('[CRON] Sending daily newsletter digest...');
      await PostService.sendNewsletterDigest('DAILY');
    } catch (error) {
      console.error('[CRON] Error sending daily digest:', error);
    }
  });

  // Weekly newsletter digest - Monday 9:00 AM
  cron.schedule('0 9 * * 1', async () => {
    try {
      console.log('[CRON] Sending weekly newsletter digest...');
      await PostService.sendNewsletterDigest('WEEKLY');
    } catch (error) {
      console.error('[CRON] Error sending weekly digest:', error);
    }
  });

  // Monthly newsletter digest - 1st day of month, 10:00 AM
  cron.schedule('0 10 1 * *', async () => {
    try {
      console.log('[CRON] Sending monthly newsletter digest...');
      await PostService.sendNewsletterDigest('MONTHLY');
    } catch (error) {
      console.error('[CRON] Error sending monthly digest:', error);
    }
  });

  // Cleanup activity logs - daily at 3:00 AM (tách riêng với cleanup jobs)
  cron.schedule('0 3 * * *', async () => {
    try {
      console.log('[CRON] Cleaning up old activity logs...');
      await PostService.cleanupActivityLogs();
    } catch (error) {
      console.error('[CRON] Error cleaning up logs:', error);
    }
  });

  // ==========================================
  // VIEW SYNC TASK
  // ==========================================

  // Sync view counts - every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    console.log('[CRON] Starting view count sync...');
    try {
      const result = await syncViewCounts();
      if (result) {
        console.log('[CRON] View count sync completed successfully');
      } else {
        console.warn('[CRON] View count sync completed with errors');
      }
    } catch (error) {
      console.error('[CRON] Error syncing view counts:', error);
    }
  });

  // ==========================================
  // CLEANUP TASKS
  // ==========================================

  // Cleanup expired tokens - Every 6 hours
  cron.schedule('0 */6 * * *', async () => {
    console.log('[CRON] Cleaning up expired tokens...');
    try {
      await CleanupService.cleanupExpiredVerificationTokens();
      await CleanupService.cleanupExpiredPasswordResetTokens();
    } catch (error) {
      console.error('[CRON] Error cleaning up tokens:', error);
    }
  });

  // Cleanup unverified users - Every 15 mins
  cron.schedule('*/15 * * * *', async () => {
    console.log('[CRON] Cleaning up unverified users...');
    try {
      await CleanupService.cleanupUnverifiedUsers();
    } catch (error) {
      console.error('[CRON] Error cleaning up unverified users:', error);
    }
  });

  // Cleanup inactive subscriptions - Weekly on Sunday 5 AM
  cron.schedule('0 5 * * 0', async () => {
    console.log('[CRON] Cleaning up inactive subscriptions...');
    try {
      await CleanupService.cleanupInactiveSubscriptions();
    } catch (error) {
      console.error('[CRON] Error cleaning up subscriptions:', error);
    }
  });

  // Cleanup old email logs - Monthly on 1st at 6 AM
  cron.schedule('0 6 1 * *', async () => {
    console.log('[CRON] Cleaning up old email logs...');
    try {
      await CleanupService.cleanupOldEmailLogs();
    } catch (error) {
      console.error('[CRON] Error cleaning up email logs:', error);
    }
  });

  // Master cleanup - Weekly on Saturday 3 AM
  cron.schedule('0 3 * * 6', async () => {
    console.log('[CRON] Running master cleanup...');
    try {
      await CleanupService.runAllCleanupTasks();
    } catch (error) {
      console.error('[CRON] Error in master cleanup:', error);
    }
  });

  console.log('✅ Cron jobs started successfully');
  console.log('📋 Active schedules:');
  console.log('  - Cleanup old jobs: 2:00 AM');
  console.log('  - Publish scheduled posts: every 5 minutes');
  console.log('  - Process translations: every 10 minutes');
  console.log('  - Daily digest: 8:00 AM');
  console.log('  - Weekly digest: Monday 9:00 AM');
  console.log('  - Monthly digest: 1st day, 10:00 AM');
  console.log('  - Cleanup activity logs: 3:00 AM');
  console.log('  - Sync view counts: every 15 minutes');
  console.log('  - Expired tokens: Every 6 hours');
  console.log('  - Unverified users: Every 15 minutes');
  console.log('  - Inactive subscriptions: Sunday 5 AM');
  console.log('  - Old email logs: Monthly 1st 6 AM');
  console.log('  - Master cleanup: Saturday 3 AM');
}

// Manual sync function (can be called via API endpoint)
export async function manualViewSync() {
  console.log('🔄 Manual view count sync triggered...');

  try {
    const result = await syncViewCounts();

    if (result) {
      console.log('✅ Manual view count sync completed');
      return { success: true, message: 'View counts synced successfully' };
    } else {
      console.warn('⚠️ Manual view count sync completed with errors');
      return { success: false, message: 'Sync completed with errors' };
    }
  } catch (error) {
    console.error('❌ Manual view count sync failed:', error);
    if (error instanceof Error) {
      return { success: false, message: 'Sync failed', error: error.message };
    }

    // Fallback for non-Error objects
    return {
      success: false,
      message: 'Sync failed',
      error: String(error),
    };
  }
}
