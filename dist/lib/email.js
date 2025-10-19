"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resend = void 0;
exports.sendEmail = sendEmail;
const resend_1 = require("resend");
const config_1 = require("../config");
exports.resend = new resend_1.Resend(config_1.config.email.resendApiKey);
async function sendEmail({ to, subject, html, text }) {
    try {
        const result = await exports.resend.emails.send({
            from: `${config_1.config.email.from.name} <${config_1.config.email.from.email}>`,
            to: Array.isArray(to) ? to : [to],
            subject,
            html,
            ...(text && { text }),
        });
        console.log('✅ Email sent:', result);
        return { success: true, data: result };
    }
    catch (error) {
        console.error('❌ Email send failed:', error);
        return { success: false, error };
    }
}
//# sourceMappingURL=email.js.map