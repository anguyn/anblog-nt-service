import { Router } from 'express';
import { z } from 'zod';
import { addEmailJob, EmailPriority } from '#queues/email.queue';
import {
  canResendVerificationEmail,
  canResendPasswordReset,
  checkEmailRateLimit,
  formatRetryAfter,
} from '#libs/rate-limiter';
import { t } from '#libs/i18n';
import { getLocaleFromRequest } from '#libs/i18n/middleware';

const router = Router();

const sendEmailSchema = z.object({
  to: z.union([z.string().email(), z.array(z.string().email())]),
  subject: z.string().min(1).optional(),
  html: z.string().optional(),
  text: z.string().optional(),
  template: z.string().optional(),
  data: z.any().optional(),
  priority: z.number().int().min(1).max(15).optional(),
  userId: z.string().optional(),
  emailType: z.enum(['verification', 'password_reset', 'normal', 'notification', 'newsletter']).optional(),
});

router.post('/send', async (req, res) => {
  try {
    const locale = getLocaleFromRequest(req);
    const body = sendEmailSchema.parse(req.body);
    const priority = body.priority || EmailPriority.NORMAL;
    const emailAddress = Array.isArray(body.to) ? body.to[0] : body.to;

    // Rate limit checks
    if (emailAddress) {
      if (body.emailType === 'verification') {
        const rateLimit = await canResendVerificationEmail(emailAddress);
        if (!rateLimit.allowed) {
          return res.status(429).json({
            error: t('rateLimit.exceeded', locale),
            message: t('rateLimit.verification', locale, {
              time: formatRetryAfter(rateLimit.retryAfter!),
            }),
            retryAfter: rateLimit.retryAfter,
            resetAt: rateLimit.resetAt,
          });
        }
      } else if (body.emailType === 'password_reset') {
        const rateLimit = await canResendPasswordReset(emailAddress);
        if (!rateLimit.allowed) {
          return res.status(429).json({
            error: t('rateLimit.exceeded', locale),
            message: t('rateLimit.passwordReset', locale, {
              time: formatRetryAfter(rateLimit.retryAfter!),
            }),
            retryAfter: rateLimit.retryAfter,
            resetAt: rateLimit.resetAt,
          });
        }
      }
    }

    // User rate limit
    if (body.userId) {
      const userRateLimit = await checkEmailRateLimit(body.userId);
      if (!userRateLimit.allowed) {
        return res.status(429).json({
          error: t('rateLimit.exceeded', locale),
          message: t('rateLimit.tooManyEmails', locale, {
            time: formatRetryAfter(userRateLimit.retryAfter!),
          }),
          retryAfter: userRateLimit.retryAfter,
          resetAt: userRateLimit.resetAt,
        });
      }
    }

    // Validation
    if (!body.html && !body.text && !body.template) {
      return res.status(400).json({
        error: t('validation.invalidRequest', locale),
        message: t('validation.mustProvideHtmlOrTemplate', locale),
      });
    }

    if (body.template && !body.data) {
      return res.status(400).json({
        error: t('validation.invalidRequest', locale),
        message: t('validation.templateRequiresData', locale),
      });
    }

    const job = await addEmailJob(
      {
        to: body.to,
        subject: body.subject || 'No Subject',
        ...(body.html && { html: body.html }),
        ...(body.text && { text: body.text }),
        ...(body.template && { template: body.template }),
        ...(body.data && { templateData: body.data }),
        ...(body.data && { data: body.data }),
        ...(body.userId && { userId: body.userId }),
        ...(body.emailType && { emailType: body.emailType }),
      },
      priority as EmailPriority
    );

    res.json({
      success: true,
      jobId: job.id,
      priority,
      message: t('api.email.queued', locale),
    });
  } catch (error) {
    const locale = getLocaleFromRequest(req);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: t('validation.invalidRequest', locale),
        details: error.issues,
      });
    }

    console.error('Send email error:', error);
    res.status(500).json({
      error: t('api.email.failed', locale),
    });
  }
});

router.post('/send-bulk', async (req, res) => {
  try {
    const locale = getLocaleFromRequest(req);
    const { emails } = req.body;

    if (!Array.isArray(emails)) {
      return res.status(400).json({
        error: t('validation.emailsArray', locale),
      });
    }

    if (emails.length === 0) {
      return res.status(400).json({
        error: t('validation.emailsNotEmpty', locale),
      });
    }

    if (emails.length > 1000) {
      return res.status(400).json({
        error: t('validation.maxBulkEmails', locale),
      });
    }

    const jobs = await Promise.all(
      emails.map((email) => {
        const parsed = sendEmailSchema.parse(email);
        return addEmailJob(
          {
            to: parsed.to,
            subject: parsed.subject || 'No Subject',
            ...(parsed.html && { html: parsed.html }),
            ...(parsed.text && { text: parsed.text }),
            ...(parsed.template && { template: parsed.template }),
            ...(parsed.data && { data: parsed.data }),
            ...(parsed.userId && { userId: parsed.userId }),
          },
          (parsed.priority || EmailPriority.NORMAL) as EmailPriority
        );
      })
    );

    res.json({
      success: true,
      count: jobs.length,
      message: t('api.email.bulkQueued', locale, { count: jobs.length }),
    });
  } catch (error) {
    const locale = getLocaleFromRequest(req);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: t('validation.invalidRequest', locale),
        details: error.issues,
      });
    }

    console.error('Send bulk emails error:', error);
    res.status(500).json({
      error: t('api.email.failed', locale),
    });
  }
});

export default router;
