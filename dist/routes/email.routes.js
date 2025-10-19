import { Router } from 'express';
import { z } from 'zod';
import { addEmailJob, EmailPriority } from '#queues/email.queue';
import { canResendVerificationEmail, canResendPasswordReset, checkEmailRateLimit, formatRetryAfter, } from '#lib/rate-limiter';
const router = Router();
const sendEmailSchema = z.object({
    to: z.union([z.string().email(), z.array(z.string().email())]),
    subject: z.string().min(1).optional(), // Optional if using template
    html: z.string().optional(),
    text: z.string().optional(),
    template: z.string().optional(),
    data: z.any().optional(), // Changed from z.record(z.any())
    priority: z.number().int().min(1).max(15).optional(),
    userId: z.string().optional(),
    emailType: z.enum(['verification', 'password_reset', 'normal']).optional(),
});
router.post('/send', async (req, res) => {
    try {
        const body = sendEmailSchema.parse(req.body);
        const priority = body.priority || EmailPriority.NORMAL;
        const emailAddress = Array.isArray(body.to) ? body.to[0] : body.to;
        if (emailAddress) {
            if (body.emailType === 'verification') {
                const rateLimit = await canResendVerificationEmail(emailAddress);
                if (!rateLimit.allowed) {
                    return res.status(429).json({
                        error: 'Rate limit exceeded',
                        message: `Vui lòng đợi ${formatRetryAfter(rateLimit.retryAfter)} trước khi gửi lại email xác thực`,
                        retryAfter: rateLimit.retryAfter,
                        resetAt: rateLimit.resetAt,
                    });
                }
            }
            else if (body.emailType === 'password_reset') {
                const rateLimit = await canResendPasswordReset(emailAddress);
                if (!rateLimit.allowed) {
                    return res.status(429).json({
                        error: 'Rate limit exceeded',
                        message: `Vui lòng đợi ${formatRetryAfter(rateLimit.retryAfter)} trước khi yêu cầu đặt lại mật khẩu`,
                        retryAfter: rateLimit.retryAfter,
                        resetAt: rateLimit.resetAt,
                    });
                }
            }
        }
        // Check general user rate limit
        if (body.userId) {
            const userRateLimit = await checkEmailRateLimit(body.userId);
            if (!userRateLimit.allowed) {
                return res.status(429).json({
                    error: 'Rate limit exceeded',
                    message: `Bạn đã gửi quá nhiều email. Vui lòng đợi ${formatRetryAfter(userRateLimit.retryAfter)}`,
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
        const job = await addEmailJob({
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
        if (error instanceof z.ZodError) {
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
            return addEmailJob({
                to: parsed.to,
                subject: parsed.subject || 'No Subject',
                ...(parsed.html && { html: parsed.html }),
                ...(parsed.text && { text: parsed.text }),
                ...(parsed.template && { template: parsed.template }),
                ...(parsed.data && { data: parsed.data }),
                ...(parsed.userId && { userId: parsed.userId }),
            }, (parsed.priority || EmailPriority.NORMAL));
        }));
        res.json({
            success: true,
            count: jobs.length,
            message: `${jobs.length} emails queued successfully`,
        });
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: 'Invalid request',
                details: error.issues,
            });
        }
        console.error('Send bulk emails error:', error);
        res.status(500).json({ error: 'Failed to queue emails' });
    }
});
export default router;
//# sourceMappingURL=email.routes.js.map