import { Worker, Job } from 'bullmq';
import { redis } from '#lib/redis';
import { sendEmail } from '#lib/email';
import { EmailJobData } from '#queues/email.queue';
import { renderEmailTemplate } from '../templates';

export const emailWorker = new Worker<EmailJobData>(
  'email',
  async (job: Job<EmailJobData>) => {
    console.log(`Processing email job ${job.id} with priority ${job.opts.priority}...`);

    const { to, subject, html, text, template, data } = job.data;

    let emailHtml = html || '';
    let emailText = text || '';

    // Render template if provided
    if (template && data) {
      const rendered = renderEmailTemplate(template, data);
      emailHtml = rendered.html;
      emailText = rendered.text;
    }

    // Validate we have content
    if (!emailHtml && !emailText) {
      throw new Error('Email must have either html or text content');
    }

    const result = await sendEmail({
      to,
      subject,
      html: emailHtml,
      text: emailText,
    });

    if (!result.success) {
      throw new Error('Failed to send email');
    }

    return result;
  },
  {
    connection: redis,
    concurrency: 5,
    limiter: {
      max: 100, // Max 100 jobs
      duration: 60000, // per 60 seconds
    },
  }
);

emailWorker.on('completed', (job) => {
  console.log(`✅ Email job ${job.id} completed (priority: ${job.opts.priority})`);
});

emailWorker.on('failed', (job, err) => {
  console.error(`❌ Email job ${job?.id} failed:`, err.message);
});

export default emailWorker;
