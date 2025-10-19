import { Worker } from 'bullmq';
import { EmailJobData } from '#queues/email.queue';
export declare const emailWorker: Worker<EmailJobData, any, string>;
export default emailWorker;
//# sourceMappingURL=email.worker.d.ts.map