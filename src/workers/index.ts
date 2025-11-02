import './email.worker';
import './notification.worker';
import { emailWorker } from './email.worker';
import { translationWorker } from '#src/queues/media.queue';
import { notificationWorker } from './notification.worker';

console.log('🔧 Workers initialized');

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  console.log(`\n${signal} received, closing workers gracefully...`);

  try {
    await emailWorker.close();
    console.log('✅ Email worker closed');

    await notificationWorker.close();
    console.log('✅ Notification worker closed');

    await translationWorker.close();
    console.log('✅ Translation worker closed');

    console.log('👋 All workers closed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

console.log('🚀 Workers started successfully');
