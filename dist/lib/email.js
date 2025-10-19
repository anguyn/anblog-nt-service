import { Resend } from 'resend';
import { config } from '../config';
export const resend = new Resend(config.email.resendApiKey);
export async function sendEmail({ to, subject, html, text }) {
    try {
        const result = await resend.emails.send({
            from: `${config.email.from.name} <${config.email.from.email}>`,
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