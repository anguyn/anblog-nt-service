import cron from 'node-cron';
import { cleanupOldJobs } from './cleanup-jobs';

export function startCronJobs() {
  // Cleanup old jobs every day at 2 AM
  cron.schedule('0 2 * * *', async () => {
    console.log('Running job cleanup...');
    await cleanupOldJobs();
  });

  // TODO: Add more cron jobs later
  // - Daily digest emails
  // - Scheduled posts
  // - etc.

  console.log('✅ Cron jobs started');
}
