import { Worker, Job } from 'bullmq';
import { redis } from '#libs/redis';
import { sendEmail } from '#libs/email';
import { EmailJobData } from '#queues/email.queue';
import { renderEmailTemplate } from '../templates';

export const emailWorker = new Worker<EmailJobData>(
  'email',
  async (job: Job<EmailJobData>) => {
    console.log(`📨 Processing email job ${job.id} with priority ${job.opts.priority}...`);

    const { to, subject, html, text, template, templateData, locale = 'vi', attachments, replyTo, cc, bcc } = job.data;

    let emailHtml = html || '';
    let emailText = text || '';
    let emailSubject = subject || '';

    // Render template if provided
    if (template && templateData) {
      const rendered = renderEmailTemplate({
        template,
        locale,
        data: templateData,
      });

      emailHtml = rendered.html;
      emailText = rendered.text;
      emailSubject = subject || rendered.subject;
    }

    // Validate we have content
    if (!emailHtml && !emailText) {
      throw new Error('Email must have either html or text content');
    }

    if (!emailSubject) {
      throw new Error('Email must have a subject');
    }

    // Send email with fallback support
    const result = await sendEmail({
      to,
      subject: emailSubject,
      html: emailHtml,
      text: emailText,
      ...(attachments && { attachments }),
      ...(replyTo && { replyTo }),
      ...(cc && { cc }),
      ...(bcc && { bcc }),
    });

    if (!result.success) {
      // Log detailed error for debugging
      console.error('❌ All email providers failed:', {
        jobId: job.id,
        to,
        subject: emailSubject,
        error: result.error,
      });

      throw new Error(result.error?.message || 'Failed to send email via all providers');
    }

    console.log(`✅ Email sent successfully for job ${job.id}`);
    return result;
  },
  {
    connection: redis,
    concurrency: 5,
    limiter: {
      max: 100,
      duration: 60000,
    },
  }
);

emailWorker.on('completed', (job) => {
  console.log(`✅ Email job ${job.id} completed successfully (priority: ${job.opts.priority})`);
});

emailWorker.on('failed', (job, err) => {
  console.error(`❌ Email job ${job?.id} failed after all retries:`, {
    error: err.message,
    attempts: job?.attemptsMade,
    priority: job?.opts.priority,
  });
});

emailWorker.on('stalled', (jobId) => {
  console.warn(`⚠️ Email job ${jobId} has stalled`);
});

export default emailWorker;
