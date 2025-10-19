import './email.worker';
import './notification.worker';
import { emailWorker } from './email.worker';
import { notificationWorker } from './notification.worker';

console.log('🚀 Workers started');

process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing workers...');
  await emailWorker.close();
  await notificationWorker.close();
  process.exit(0);
});
