"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const email_queue_1 = require("../queues/email.queue");
const notification_queue_1 = require("../queues/notification.queue");
const router = (0, express_1.Router)();
/**
 * GET /api/monitoring/stats
 * Tổng quan về queues
 */
router.get('/stats', async (req, res) => {
    try {
        const [emailCounts, notificationCounts] = await Promise.all([
            email_queue_1.emailQueue.getJobCounts(),
            notification_queue_1.notificationQueue.getJobCounts(),
        ]);
        // Get workers status
        const [emailWorkers, notificationWorkers] = await Promise.all([
            email_queue_1.emailQueue.getWorkers(),
            notification_queue_1.notificationQueue.getWorkers(),
        ]);
        res.json({
            timestamp: new Date().toISOString(),
            queues: {
                email: {
                    counts: emailCounts,
                    workers: emailWorkers.length,
                },
                notification: {
                    counts: notificationCounts,
                    workers: notificationWorkers.length,
                },
            },
            totals: {
                waiting: (emailCounts?.waiting ?? 0) + (notificationCounts?.waiting ?? 0),
                active: (emailCounts?.active ?? 0) + (notificationCounts?.active ?? 0),
                completed: (emailCounts?.completed ?? 0) + (notificationCounts?.completed ?? 0),
                failed: (emailCounts?.failed ?? 0) + (notificationCounts?.failed ?? 0),
            },
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to get stats' });
    }
});
/**
 * GET /api/monitoring/jobs/failed
 * Lấy danh sách failed jobs
 */
router.get('/jobs/failed', async (req, res) => {
    try {
        const queue = req.query.queue;
        const limit = parseInt(req.query.limit) || 50;
        let jobs = [];
        if (queue === 'email' || !queue) {
            const emailJobs = await email_queue_1.emailQueue.getFailed(0, limit);
            jobs = [...jobs, ...emailJobs];
        }
        if (queue === 'notification' || !queue) {
            const notificationJobs = await notification_queue_1.notificationQueue.getFailed(0, limit);
            jobs = [...jobs, ...notificationJobs];
        }
        const jobsData = jobs.map((job) => ({
            id: job.id,
            name: job.name,
            queue: job.queueName,
            data: job.data,
            failedReason: job.failedReason,
            stacktrace: job.stacktrace,
            attemptsMade: job.attemptsMade,
            timestamp: job.timestamp,
            processedOn: job.processedOn,
            finishedOn: job.finishedOn,
        }));
        res.json({
            count: jobsData.length,
            jobs: jobsData,
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to get failed jobs' });
    }
});
/**
 * GET /api/monitoring/jobs/waiting
 * Lấy danh sách waiting jobs
 */
router.get('/jobs/waiting', async (req, res) => {
    try {
        const queue = req.query.queue;
        const limit = parseInt(req.query.limit) || 50;
        let jobs = [];
        if (queue === 'email' || !queue) {
            const emailJobs = await email_queue_1.emailQueue.getWaiting(0, limit);
            jobs = [...jobs, ...emailJobs];
        }
        if (queue === 'notification' || !queue) {
            const notificationJobs = await notification_queue_1.notificationQueue.getWaiting(0, limit);
            jobs = [...jobs, ...notificationJobs];
        }
        const jobsData = jobs.map((job) => ({
            id: job.id,
            name: job.name,
            queue: job.queueName,
            data: job.data,
            timestamp: job.timestamp,
            priority: job.opts.priority,
        }));
        res.json({
            count: jobsData.length,
            jobs: jobsData,
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to get waiting jobs' });
    }
});
/**
 * POST /api/monitoring/jobs/:jobId/retry
 * Retry một failed job
 */
router.post('/jobs/:jobId/retry', async (req, res) => {
    try {
        const { jobId } = req.params;
        const { queue } = req.body;
        let job;
        if (queue === 'email') {
            job = await email_queue_1.emailQueue.getJob(jobId);
        }
        else if (queue === 'notification') {
            job = await notification_queue_1.notificationQueue.getJob(jobId);
        }
        if (!job) {
            return res.status(404).json({ error: 'Job not found' });
        }
        await job.retry();
        res.json({
            success: true,
            message: 'Job queued for retry',
            jobId: job.id,
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to retry job' });
    }
});
/**
 * POST /api/monitoring/jobs/retry-failed
 * Retry tất cả failed jobs
 */
router.post('/jobs/retry-failed', async (req, res) => {
    try {
        const { queue, limit = 100 } = req.body;
        let retriedCount = 0;
        if (queue === 'email' || !queue) {
            const emailJobs = await email_queue_1.emailQueue.getFailed(0, limit);
            for (const job of emailJobs) {
                await job.retry();
                retriedCount++;
            }
        }
        if (queue === 'notification' || !queue) {
            const notificationJobs = await notification_queue_1.notificationQueue.getFailed(0, limit);
            for (const job of notificationJobs) {
                await job.retry();
                retriedCount++;
            }
        }
        res.json({
            success: true,
            message: `Retried ${retriedCount} failed jobs`,
            count: retriedCount,
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to retry jobs' });
    }
});
/**
 * DELETE /api/monitoring/jobs/:jobId
 * Xóa một job
 */
router.delete('/jobs/:jobId', async (req, res) => {
    try {
        const { jobId } = req.params;
        const { queue } = req.query;
        let job;
        if (queue === 'email') {
            job = await email_queue_1.emailQueue.getJob(jobId);
        }
        else if (queue === 'notification') {
            job = await notification_queue_1.notificationQueue.getJob(jobId);
        }
        if (!job) {
            return res.status(404).json({ error: 'Job not found' });
        }
        await job.remove();
        res.json({
            success: true,
            message: 'Job removed',
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to remove job' });
    }
});
/**
 * POST /api/monitoring/jobs/clean
 * Clean old jobs
 */
router.post('/jobs/clean', async (req, res) => {
    try {
        const { queue, status, grace = 3600000 } = req.body; // Default 1 hour
        let cleaned = 0;
        if (queue === 'email' || !queue) {
            const result = await email_queue_1.emailQueue.clean(grace, 1000, status);
            cleaned += result.length;
        }
        if (queue === 'notification' || !queue) {
            const result = await notification_queue_1.notificationQueue.clean(grace, 1000, status);
            cleaned += result.length;
        }
        res.json({
            success: true,
            message: `Cleaned ${cleaned} ${status} jobs`,
            count: cleaned,
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to clean jobs' });
    }
});
/**
 * GET /api/monitoring/jobs/:jobId
 * Lấy chi tiết một job
 */
router.get('/jobs/:jobId', async (req, res) => {
    try {
        const { jobId } = req.params;
        const { queue } = req.query;
        let job;
        if (queue === 'email') {
            job = await email_queue_1.emailQueue.getJob(jobId);
        }
        else if (queue === 'notification') {
            job = await notification_queue_1.notificationQueue.getJob(jobId);
        }
        if (!job) {
            return res.status(404).json({ error: 'Job not found' });
        }
        const state = await job.getState();
        const logs = await email_queue_1.emailQueue.getJobLogs(jobId);
        res.json({
            id: job.id,
            name: job.name,
            queue: job.queueName,
            data: job.data,
            state,
            progress: job.progress,
            attemptsMade: job.attemptsMade,
            timestamp: job.timestamp,
            processedOn: job.processedOn,
            finishedOn: job.finishedOn,
            failedReason: job.failedReason,
            stacktrace: job.stacktrace,
            returnvalue: job.returnvalue,
            logs,
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to get job details' });
    }
});
exports.default = router;
//# sourceMappingURL=monitoring.routes.js.map