import { Router } from 'express';
import { redis } from '#libs/redis';
import { emailQueue } from '#queues/email.queue';
import { notificationQueue } from '#queues/notification.queue';
import { t } from '#libs/i18n';
import { getLocaleFromRequest } from '#libs/i18n/middleware';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const locale = getLocaleFromRequest(req);
    const redisStatus = await redis.ping();
    const [emailCounts, notificationCounts] = await Promise.all([
      emailQueue.getJobCounts(),
      notificationQueue.getJobCounts(),
    ]);

    res.json({
      status: t('health.healthy', locale),
      timestamp: new Date().toISOString(),
      redis: redisStatus === 'PONG' ? t('health.redis.connected', locale) : t('health.redis.disconnected', locale),
      queues: {
        email: emailCounts,
        notification: notificationCounts,
      },
    });
  } catch (error) {
    const locale = getLocaleFromRequest(req);
    res.status(500).json({
      status: t('health.unhealthy', locale),
      error: t('health.checkFailed', locale),
      timestamp: new Date().toISOString(),
    });
  }
});

router.get('/redis', async (req, res) => {
  try {
    const locale = getLocaleFromRequest(req);
    await redis.ping();
    res.json({
      status: 'ok',
      redis: t('health.redis.connected', locale),
    });
  } catch (error) {
    const locale = getLocaleFromRequest(req);
    res.status(500).json({
      status: 'error',
      redis: t('health.redis.disconnected', locale),
      error: error,
    });
  }
});

export default router;
