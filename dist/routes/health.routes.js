"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const redis_1 = require("../lib/redis");
const email_queue_1 = require("../queues/email.queue");
const notification_queue_1 = require("../queues/notification.queue");
const router = (0, express_1.Router)();
router.get('/', async (req, res) => {
    try {
        const redisStatus = await redis_1.redis.ping();
        const [emailCounts, notificationCounts] = await Promise.all([
            email_queue_1.emailQueue.getJobCounts(),
            notification_queue_1.notificationQueue.getJobCounts(),
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
    }
    catch (error) {
        res.status(500).json({
            status: 'unhealthy',
            error: 'Service check failed',
            timestamp: new Date().toISOString(),
        });
    }
});
router.get('/redis', async (req, res) => {
    try {
        await redis_1.redis.ping();
        res.json({ status: 'ok', redis: 'connected' });
    }
    catch (error) {
        res.status(500).json({ status: 'error', redis: 'disconnected', error: error });
    }
});
exports.default = router;
//# sourceMappingURL=health.routes.js.map