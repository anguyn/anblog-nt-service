import { Resend } from 'resend';
export declare const resend: Resend;
interface SendEmailParams {
    to: string | string[];
    subject: string;
    html: string;
    text?: string;
}
export declare function sendEmail({ to, subject, html, text }: SendEmailParams): Promise<{
    success: boolean;
    data: import("resend").CreateEmailResponse;
    error?: never;
} | {
    success: boolean;
    error: unknown;
    data?: never;
}>;
export {};
//# sourceMappingURL=email.d.ts.map