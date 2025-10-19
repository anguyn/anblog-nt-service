import { Router } from 'express';
import { SocketService } from '#services/socket.service';
import { SOCKET_EVENTS } from '#sockets/events';

const router = Router();

/**
 * POST /api/socket/test
 * Test sending notification via socket
 */
router.post('/test', async (req, res) => {
  try {
    const { userId, message } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
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
      message: `Notification sent to user ${userId}`,
    });
  } catch (error) {
    console.error('Socket test error:', error);
    res.status(500).json({ error: 'Failed to send test notification' });
  }
});

/**
 * POST /api/socket/broadcast
 * Broadcast message to all connected clients
 */
router.post('/broadcast', async (req, res) => {
  try {
    const { message } = req.body;

    SocketService.broadcast(SOCKET_EVENTS.SYSTEM_MESSAGE, {
      message: message || 'System broadcast',
      timestamp: new Date().toISOString(),
    });

    res.json({ success: true, message: 'Broadcast sent' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to broadcast' });
  }
});

export default router;
