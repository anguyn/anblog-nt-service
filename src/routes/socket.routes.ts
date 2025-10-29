import { Router } from 'express';
import { SocketService } from '#services/socket.service';
import { SOCKET_EVENTS } from '#sockets/events';
import { t } from '#libs/i18n';
import { getLocaleFromRequest } from '#libs/i18n/middleware';

const router = Router();

/**
 * POST /api/socket/test
 * Test sending notification via socket
 */
router.post('/test', async (req, res) => {
  try {
    const locale = getLocaleFromRequest(req);
    const { userId, message } = req.body;

    if (!userId) {
      return res.status(400).json({
        error: t('validation.userIdRequired', locale),
      });
    }

    // Send test notification
    SocketService.sendNotification(userId, {
      id: `test-${Date.now()}`,
      type: 'test',
      title: 'Test Notification',
      message: message || 'This is a test notification from Socket.IO',
      timestamp: new Date().toISOString(),
      read: false,
    });

    res.json({
      success: true,
      message: t('api.notification.sent', locale, { userId }),
    });
  } catch (error) {
    const locale = getLocaleFromRequest(req);
    console.error('Socket test error:', error);
    res.status(500).json({
      error: t('api.notification.failed', locale),
    });
  }
});

/**
 * POST /api/socket/broadcast
 * Broadcast message to all connected clients
 */
router.post('/broadcast', async (req, res) => {
  try {
    const locale = getLocaleFromRequest(req);
    const { message } = req.body;

    SocketService.broadcast(SOCKET_EVENTS.SYSTEM_MESSAGE, {
      message: message || 'System broadcast',
      timestamp: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: t('api.broadcast.sent', locale),
    });
  } catch (error) {
    const locale = getLocaleFromRequest(req);
    res.status(500).json({
      error: t('api.broadcast.failed', locale),
    });
  }
});

export default router;
