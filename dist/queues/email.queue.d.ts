import { Queue } from 'bullmq';
export interface EmailJobData {
    to: string | string[];
    subject: string;
    html?: string;
    text?: string;
    template?: string;
    data?: Record<string, any>;
    userId?: string;
}
export declare enum EmailPriority {
    CRITICAL = 1,// Verification, Password Reset
    HIGH = 5,// Welcome emails
    NORMAL = 10,// Regular notifications
    LOW = 15
}
export declare const emailQueue: Queue<EmailJobData, any, string, EmailJobData, any, string>;
export declare function addEmailJob(data: EmailJobData, priority?: EmailPriority): Promise<import("bullmq").Job<EmailJobData, any, string>>;
//# sourceMappingURL=email.queue.d.ts.map