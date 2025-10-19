"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const socket_service_1 = require("../services/socket.service");
const events_1 = require("../sockets/events");
const router = (0, express_1.Router)();
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
        socket_service_1.SocketService.sendNotification(userId, {
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
    }
    catch (error) {
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
        socket_service_1.SocketService.broadcast(events_1.SOCKET_EVENTS.SYSTEM_MESSAGE, {
            message: message || 'System broadcast',
            timestamp: new Date().toISOString(),
        });
        res.json({ success: true, message: 'Broadcast sent' });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to broadcast' });
    }
});
exports.default = router;
//# sourceMappingURL=socket.routes.js.map