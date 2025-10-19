import { Router } from 'express';
import { redis } from '#lib/redis';
import { emailQueue } from '#queues/email.queue';
import { notificationQueue } from '#queues/notification.queue';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const redisStatus = await redis.ping();
    const [emailCounts, notificationCounts] = await Promise.all([
      emailQueue.getJobCounts(),
      notificationQueue.getJobCounts(),
    ]);

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      redis: redisStatus === 'PONG' ? 'connected' : 'disconnected',
      queues: {
        email: emailCounts,
        notification: notificationCounts,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: 'Service check failed',
      timestamp: new Date().toISOString(),
    });
  }
});

router.get('/redis', async (req, res) => {
  try {
    await redis.ping();
    res.json({ status: 'ok', redis: 'connected' });
  } catch (error) {
    res.status(500).json({ status: 'error', redis: 'disconnected', error: error });
  }
});

export default router;
