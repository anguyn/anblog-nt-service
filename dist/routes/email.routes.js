"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const email_queue_1 = require("../queues/email.queue");
const rate_limiter_1 = require("../lib/rate-limiter");
const router = (0, express_1.Router)();
const sendEmailSchema = zod_1.z.object({
    to: zod_1.z.union([zod_1.z.string().email(), zod_1.z.array(zod_1.z.string().email())]),
    subject: zod_1.z.string().min(1).optional(), // Optional if using template
    html: zod_1.z.string().optional(),
    text: zod_1.z.string().optional(),
    template: zod_1.z.string().optional(),
    data: zod_1.z.any().optional(), // Changed from z.record(z.any())
    priority: zod_1.z.number().int().min(1).max(15).optional(),
    userId: zod_1.z.string().optional(),
    emailType: zod_1.z.enum(['verification', 'password_reset', 'normal']).optional(),
});
router.post('/send', async (req, res) => {
    try {
        const body = sendEmailSchema.parse(req.body);
        const priority = body.priority || email_queue_1.EmailPriority.NORMAL;
        const emailAddress = Array.isArray(body.to) ? body.to[0] : body.to;
        if (emailAddress) {
            if (body.emailType === 'verification') {
                const rateLimit = await (0, rate_limiter_1.canResendVerificationEmail)(emailAddress);
                if (!rateLimit.allowed) {
                    return res.status(429).json({
                        error: 'Rate limit exceeded',
                        message: `Vui lòng đợi ${(0, rate_limiter_1.formatRetryAfter)(rateLimit.retryAfter)} trước khi gửi lại email xác thực`,
                        retryAfter: rateLimit.retryAfter,
                        resetAt: rateLimit.resetAt,
                    });
                }
            }
            else if (body.emailType === 'password_reset') {
                const rateLimit = await (0, rate_limiter_1.canResendPasswordReset)(emailAddress);
                if (!rateLimit.allowed) {
                    return res.status(429).json({
                        error: 'Rate limit exceeded',
                        message: `Vui lòng đợi ${(0, rate_limiter_1.formatRetryAfter)(rateLimit.retryAfter)} trước khi yêu cầu đặt lại mật khẩu`,
                        retryAfter: rateLimit.retryAfter,
                        resetAt: rateLimit.resetAt,
                    });
                }
            }
        }
        // Check general user rate limit
        if (body.userId) {
            const userRateLimit = await (0, rate_limiter_1.checkEmailRateLimit)(body.userId);
            if (!userRateLimit.allowed) {
                return res.status(429).json({
                    error: 'Rate limit exceeded',
                    message: `Bạn đã gửi quá nhiều email. Vui lòng đợi ${(0, rate_limiter_1.formatRetryAfter)(userRateLimit.retryAfter)}`,
                    retryAfter: userRateLimit.retryAfter,
                    resetAt: userRateLimit.resetAt,
                });
            }
        }
        // Validate: must have either (html/text) or (template + data)
        if (!body.html && !body.text && !body.template) {
            return res.status(400).json({
                error: 'Invalid request',
                message: 'Must provide either html/text or template',
            });
        }
        if (body.template && !body.data) {
            return res.status(400).json({
                error: 'Invalid request',
                message: 'Template requires data object',
            });
        }
        const job = await (0, email_queue_1.addEmailJob)({
            to: body.to,
            subject: body.subject || 'No Subject',
            ...(body.html && { html: body.html }),
            ...(body.text && { text: body.text }),
            ...(body.template && { template: body.template }),
            ...(body.data && { data: body.data }),
            ...(body.userId && { userId: body.userId }),
        }, priority);
        res.json({
            success: true,
            jobId: job.id,
            priority,
            message: 'Email queued successfully',
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({
                error: 'Invalid request',
                details: error.issues,
            });
        }
        console.error('Send email error:', error);
        res.status(500).json({ error: 'Failed to queue email' });
    }
});
router.post('/send-bulk', async (req, res) => {
    try {
        const { emails } = req.body;
        if (!Array.isArray(emails)) {
            return res.status(400).json({ error: 'emails must be an array' });
        }
        if (emails.length === 0) {
            return res.status(400).json({ error: 'emails array cannot be empty' });
        }
        if (emails.length > 1000) {
            return res.status(400).json({ error: 'Maximum 1000 emails per batch' });
        }
        const jobs = await Promise.all(emails.map((email) => {
            const parsed = sendEmailSchema.parse(email);
            return (0, email_queue_1.addEmailJob)({
                to: parsed.to,
                subject: parsed.subject || 'No Subject',
                ...(parsed.html && { html: parsed.html }),
                ...(parsed.text && { text: parsed.text }),
                ...(parsed.template && { template: parsed.template }),
                ...(parsed.data && { data: parsed.data }),
                ...(parsed.userId && { userId: parsed.userId }),
            }, (parsed.priority || email_queue_1.EmailPriority.NORMAL));
        }));
        res.json({
            success: true,
            count: jobs.length,
            message: `${jobs.length} emails queued successfully`,
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({
                error: 'Invalid request',
                details: error.issues,
            });
        }
        console.error('Send bulk emails error:', error);
        res.status(500).json({ error: 'Failed to queue emails' });
    }
});
exports.default = router;
//# sourceMappingURL=email.routes.js.map