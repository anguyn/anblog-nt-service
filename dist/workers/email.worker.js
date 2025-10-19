"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailWorker = void 0;
const bullmq_1 = require("bullmq");
const redis_1 = require("../lib/redis");
const email_1 = require("../lib/email");
const templates_1 = require("../templates");
exports.emailWorker = new bullmq_1.Worker('email', async (job) => {
    console.log(`Processing email job ${job.id} with priority ${job.opts.priority}...`);
    const { to, subject, html, text, template, data } = job.data;
    let emailHtml = html || '';
    let emailText = text || '';
    // Render template if provided
    if (template && data) {
        const rendered = (0, templates_1.renderEmailTemplate)(template, data);
        emailHtml = rendered.html;
        emailText = rendered.text;
    }
    // Validate we have content
    if (!emailHtml && !emailText) {
        throw new Error('Email must have either html or text content');
    }
    const result = await (0, email_1.sendEmail)({
        to,
        subject,
        html: emailHtml,
        text: emailText,
    });
    if (!result.success) {
        throw new Error('Failed to send email');
    }
    return result;
}, {
    connection: redis_1.redis,
    concurrency: 5,
    limiter: {
        max: 100, // Max 100 jobs
        duration: 60000, // per 60 seconds
    },
});
exports.emailWorker.on('completed', (job) => {
    console.log(`✅ Email job ${job.id} completed (priority: ${job.opts.priority})`);
});
exports.emailWorker.on('failed', (job, err) => {
    console.error(`❌ Email job ${job?.id} failed:`, err.message);
});
exports.default = exports.emailWorker;
//# sourceMappingURL=email.worker.js.map